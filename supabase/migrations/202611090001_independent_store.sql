-- Apply ONLY to a newly created Josheph Scooters project. Never to JShop.
create extension if not exists pgcrypto;
-- Fresh Supabase commonly installs pgcrypto under extensions; pin its schema
-- in this independent database so definer functions resolve crypto safely.
alter extension pgcrypto set schema public;
create table public.admin_memberships(user_id uuid primary key references auth.users on delete cascade, created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from admin_memberships where user_id=auth.uid())$$;
create table public.profiles(id uuid primary key references auth.users on delete cascade,name text not null default '',phone text not null default '',created_at timestamptz not null default now());
create table public.categories(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,labels jsonb not null default '{}',parent_id uuid references categories,sort_order integer not null default 0,archived boolean not null default false,image text not null default '');
insert into categories(slug,name) values('scooters','Trottinettes électriques'),('ebikes','Vélos électriques'),('accessories','Accessoires'),('spare-parts','Pièces détachées');
create table public.products(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 3 and 160),slug text unique not null check(slug ~ '^[a-z0-9-]+$'),sku text unique not null,brand text not null default '',category_slug text not null references categories(slug),description text not null default '',price_millimes bigint not null check(price_millimes between 0 and 1000000000),stock integer not null default 0 check(stock>=0),low_stock_threshold integer not null default 3 check(low_stock_threshold>=0),status text not null default 'draft' check(status in ('draft','published','archived')),featured boolean not null default false,demo boolean not null default false,image text not null default '/art/scooters.svg',motor_w numeric check(motor_w>=0),battery_wh numeric check(battery_wh>=0),range_km numeric check(range_km>=0),speed_kmh numeric check(speed_kmh>=0),weight_kg numeric check(weight_kg>=0),wheel_inches numeric check(wheel_inches>=0),foldable boolean not null default false,specifications jsonb not null default '{}',localized jsonb not null default '{}',seo_title text,seo_description text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),search_document tsvector generated always as (to_tsvector('simple',name||' '||brand||' '||sku||' '||description)) stored);
create index products_search on products using gin(search_document);
create index products_catalog on products(status,category_slug,price_millimes);
create index products_specs on products(motor_w,range_km,battery_wh);
create table public.product_variants(id uuid primary key default gen_random_uuid(),product_id uuid not null references products on delete cascade,name text not null,sku text unique not null,color text not null default '',price_millimes bigint not null check(price_millimes between 0 and 1000000000),stock integer not null check(stock>=0));
create index variants_product on product_variants(product_id);
create table public.product_images(id uuid primary key default gen_random_uuid(),product_id uuid references products on delete cascade,path text unique not null,alt text not null,sort_order integer not null default 0);
create table public.product_compatibility(product_id uuid references products on delete cascade,compatible_id uuid references products on delete cascade,primary key(product_id,compatible_id),check(product_id<>compatible_id));
create table public.addresses(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,label text not null,address text not null,city text not null,governorate text not null,postal text not null);
create table public.wishlist_items(user_id uuid not null default auth.uid() references auth.users on delete cascade,product_id uuid not null references products on delete cascade,primary key(user_id,product_id));
create table public.shipping_rules(id uuid primary key default gen_random_uuid(),governorate text not null,category_slug text references categories(slug),fee_millimes bigint not null check(fee_millimes>=0),enabled boolean not null default false,unique nulls not distinct(governorate,category_slug));
create table public.site_settings(id text primary key,value jsonb not null);
insert into site_settings values ('store','{"cod_enabled":false}');
create table public.banners(id uuid primary key default gen_random_uuid(),title text not null,copy text not null default '',href text not null check(href like '/%' and href not like '//%'),image text not null default '',starts_at timestamptz not null default now(),ends_at timestamptz,enabled boolean not null default false);
create table public.orders(id uuid primary key default gen_random_uuid(),order_number text unique not null default ('JS-'||upper(encode(gen_random_bytes(6),'hex'))),user_id uuid references auth.users on delete set null,idempotency uuid unique not null,guest_token_hash text not null,request_hash text not null,customer jsonb not null,subtotal_millimes bigint not null check(subtotal_millimes>=0),shipping_millimes bigint not null check(shipping_millimes>=0),total_millimes bigint not null check(total_millimes=subtotal_millimes+shipping_millimes),status text not null default 'pending' check(status in ('pending','confirmed','preparing','shipped','delivered','cancelled')),payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid','refunded')),notes text not null default '',created_at timestamptz not null default now());
create index orders_owner on orders(user_id,created_at desc);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders on delete cascade,product_id uuid not null references products,variant_id uuid references product_variants,product_name text not null,variant_name text,unit_price_millimes bigint not null check(unit_price_millimes>=0),quantity integer not null check(quantity between 1 and 99));
create index order_items_order on order_items(order_id);
create table public.order_status_history(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders,actor_id uuid references auth.users,status text not null,note text not null default '',created_at timestamptz not null default now());
create table public.inventory_movements(id uuid primary key default gen_random_uuid(),product_id uuid not null references products,variant_id uuid references product_variants,delta integer not null,reason text not null,actor_id uuid references auth.users,created_at timestamptz not null default now());
create table public.contact_inquiries(id uuid primary key default gen_random_uuid(),name text not null,email text not null,message text not null,created_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users,entity text not null,entity_id text,operation text not null,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,hits integer not null,window_start timestamptz not null);
create function public.consume_rate(bucket text,maximum integer default 10,seconds integer default 3600) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 -- Caller cannot weaken the quota. Buckets contain hashes, not raw email/IP.
 insert into rate_limits(key,hits,window_start) values(left(bucket,200),1,now()) on conflict(key) do update set hits=case when rate_limits.window_start<now()-interval '1 hour' then 1 else rate_limits.hits+1 end,window_start=case when rate_limits.window_start<now()-interval '1 hour' then now() else rate_limits.window_start end returning hits into n;
 return n<=10;
end$$;
create function public.audit_mutation() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into audit_logs(actor_id,entity,entity_id,operation) values(auth.uid(),TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id'),TG_OP);
 if TG_OP='DELETE' then return OLD;end if;return NEW;end$$;
do $$declare t text;begin foreach t in array array['products','product_variants','categories','shipping_rules','site_settings','banners','product_images'] loop execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_mutation()',t);end loop;end$$;
-- RLS: no service-role shortcut in app, and no direct order/inventory mutations.
do $$declare t text;begin foreach t in array array['admin_memberships','profiles','categories','products','product_variants','product_images','product_compatibility','addresses','wishlist_items','shipping_rules','site_settings','banners','orders','order_items','order_status_history','inventory_movements','contact_inquiries','audit_logs','rate_limits'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
create policy own_admin_membership on admin_memberships for select to authenticated using(user_id=auth.uid());
create policy own_profile on profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy admin_profile_read on profiles for select to authenticated using(is_admin());
create policy own_address on addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_wishlist on wishlist_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy catalog_read on products for select using(status='published' or is_admin());
create policy category_read on categories for select using(not archived or is_admin());
create policy variant_read on product_variants for select using(exists(select 1 from products where id=product_id and (status='published' or is_admin())));
create policy image_read on product_images for select using(exists(select 1 from products where id=product_id and (status='published' or is_admin())));
create policy compatibility_read on product_compatibility for select using(true);
create policy settings_read on site_settings for select using(true);
create policy shipping_read on shipping_rules for select using(enabled or is_admin());
create policy banner_read on banners for select using((enabled and starts_at<=now() and (ends_at is null or ends_at>now())) or is_admin());
do $$declare t text;begin foreach t in array array['products','product_variants','product_images','product_compatibility','categories','shipping_rules','site_settings','banners'] loop execute format('create policy admin_write on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);end loop;end$$;
create policy private_orders on orders for select to authenticated using(user_id=auth.uid() or is_admin());
create policy private_items on order_items for select to authenticated using(exists(select 1 from orders where id=order_id and (user_id=auth.uid() or is_admin())));
create policy private_history on order_status_history for select to authenticated using(exists(select 1 from orders where id=order_id and (user_id=auth.uid() or is_admin())));
create policy admin_inventory_read on inventory_movements for select to authenticated using(is_admin());
create policy admin_audit_read on audit_logs for select to authenticated using(is_admin());
create policy admin_inquiry_read on contact_inquiries for select to authenticated using(is_admin());
create function public.submit_inquiry(p_name text,p_email text,p_message text) returns void language plpgsql security definer set search_path=public as $$begin
 if length(p_name) not between 2 and 120 or length(p_email)>200 or p_email not like '%@%' or length(p_message) not between 10 and 3000 then raise exception 'Invalid inquiry';end if;
 if not consume_rate('inquiry-global') then raise exception 'Try later';end if;
 insert into contact_inquiries(name,email,message) values(p_name,p_email,p_message);
end$$;
create function public.create_order(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing orders; p products; v product_variants; item jsonb; oid uuid; subtotal bigint:=0; shipping bigint:=0; fee bigint; qty integer; price bigint; fingerprint text; token_hash text; n integer;
begin
 if jsonb_typeof(payload->'items') is distinct from 'array' or coalesce(jsonb_array_length(payload->'items'),0) not between 1 and 30 or coalesce(length(payload->>'token'),0) not between 40 and 100 or coalesce((payload->>'terms')::boolean,false) is not true then raise exception 'Invalid order';end if;
 if length(payload->>'name') not between 3 and 120 or length(payload->>'address') not between 8 and 300 or length(payload->>'email')>200 or payload->>'email' not like '%@%' or payload->>'phone' !~ '^(\+216[ ]?)?[2459][0-9]{7}$' or payload->>'postal' !~ '^[0-9]{4}$' then raise exception 'Invalid customer';end if;
 fingerprint:=encode(digest((payload-'token')::text,'sha256'),'hex');token_hash:=encode(digest(payload->>'token','sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(payload->>'idempotency',0));
 select * into existing from orders where idempotency=(payload->>'idempotency')::uuid;
 if found then
 if existing.guest_token_hash<>token_hash or existing.request_hash<>fingerprint or existing.user_id is distinct from auth.uid() then raise exception 'Idempotency conflict';end if;
 return jsonb_build_object('order_number',existing.order_number);end if;
 if not consume_rate('checkout-global') then raise exception 'Try later';end if;
 if not exists(select 1 from site_settings where id='store' and value->>'cod_enabled'='true') then raise exception 'Online orders disabled';end if;
 -- Lock in stable order so concurrent overlapping carts cannot oversell or deadlock.
 perform 1 from products where id in(select (x->>'product_id')::uuid from jsonb_array_elements(payload->'items') x) order by id for update;
 perform 1 from product_variants where id in(select (x->>'variant_id')::uuid from jsonb_array_elements(payload->'items') x where x->>'variant_id' is not null) order by id for update;
 insert into orders(idempotency,user_id,guest_token_hash,request_hash,customer,subtotal_millimes,shipping_millimes,total_millimes) values((payload->>'idempotency')::uuid,auth.uid(),token_hash,fingerprint,payload-array['items','token','idempotency'],0,0,0) returning id into oid;
 for item in select * from jsonb_array_elements(payload->'items') loop
 select * into p from products where id=(item->>'product_id')::uuid;
 qty:=(item->>'quantity')::integer;
 if p.id is null or p.status<>'published' or p.demo or qty not between 1 and 99 or p.stock<qty then raise exception 'Product unavailable';end if;
 v:=null;price:=p.price_millimes;
 if item->>'variant_id' is not null then
 select * into v from product_variants where id=(item->>'variant_id')::uuid and product_id=p.id;
 if v.id is null or v.stock<qty then raise exception 'Variant unavailable';end if;
 price:=v.price_millimes;
 update product_variants set stock=stock-qty where id=v.id;
 elsif exists(select 1 from product_variants where product_id=p.id) then raise exception 'Variant required';end if;
 select fee_millimes into fee from shipping_rules where enabled and governorate=payload->>'governorate' and (category_slug is null or category_slug=p.category_slug) order by (category_slug is not null) desc limit 1;
 if fee is null then raise exception 'Delivery requires confirmation';end if;
 shipping:=greatest(shipping,fee);subtotal:=subtotal+price*qty;
 update products set stock=stock-qty,updated_at=now() where id=p.id;
 insert into order_items(order_id,product_id,variant_id,product_name,variant_name,unit_price_millimes,quantity) values(oid,p.id,v.id,p.name,v.name,price,qty);
 insert into inventory_movements(product_id,variant_id,delta,reason,actor_id) values(p.id,v.id,-qty,'Order reservation '||oid,auth.uid());
 end loop;
 update orders set subtotal_millimes=subtotal,shipping_millimes=shipping,total_millimes=subtotal+shipping where id=oid;
 insert into order_status_history(order_id,actor_id,status,note) values(oid,auth.uid(),'pending','Cash on delivery: unpaid, awaiting confirmation');
 return (select jsonb_build_object('order_number',order_number) from orders where id=oid);
end$$;
create function public.guest_order(number text,token text) returns jsonb language sql stable security definer set search_path=public as $$select jsonb_build_object('order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,'total_millimes',o.total_millimes,'shipping_millimes',o.shipping_millimes,'items',(select jsonb_agg(jsonb_build_object('product_name',i.product_name,'quantity',i.quantity,'unit_price_millimes',i.unit_price_millimes)) from order_items i where i.order_id=o.id)) from orders o where o.order_number=number and o.guest_token_hash=encode(digest(token,'sha256'),'hex')$$;
create function public.transition_order(p_id uuid,p_status text,p_payment text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare o orders;i order_items;begin
 if not is_admin() then raise exception 'Forbidden';end if;
 if length(p_note)>2000 or p_payment not in ('unpaid','paid','refunded') then raise exception 'Invalid update';end if;
 select * into o from orders where id=p_id for update;
 if o.id is null then raise exception 'Not found';end if;
 if p_status<>o.status and not ((o.status='pending' and p_status in ('confirmed','cancelled')) or (o.status='confirmed' and p_status in ('preparing','cancelled')) or (o.status='preparing' and p_status in ('shipped','cancelled')) or (o.status='shipped' and p_status='delivered')) then raise exception 'Invalid transition';end if;
 if p_payment<>o.payment_status and not ((o.payment_status='unpaid' and p_payment='paid' and p_status<>'cancelled') or (o.payment_status='paid' and p_payment='refunded')) then raise exception 'Invalid payment transition';end if;
 if p_status='cancelled' and o.status<>'cancelled' then
 if length(trim(p_note))<3 then raise exception 'Cancellation reason required';end if;
 perform 1 from products where id in(select product_id from order_items where order_id=p_id) order by id for update;
 perform 1 from product_variants where id in(select variant_id from order_items where order_id=p_id) order by id for update;
 for i in select * from order_items where order_id=p_id loop
 update products set stock=stock+i.quantity where id=i.product_id;
 update product_variants set stock=stock+i.quantity where id=i.variant_id;
 insert into inventory_movements(product_id,variant_id,delta,reason,actor_id) values(i.product_id,i.variant_id,i.quantity,'Cancellation '||p_id,auth.uid());end loop;end if;
 update orders set status=p_status,payment_status=p_payment,notes=left(p_note,2000) where id=p_id;
 insert into order_status_history(order_id,actor_id,status,note) values(p_id,auth.uid(),p_status,left(p_note,2000));
 insert into audit_logs(actor_id,entity,entity_id,operation) values(auth.uid(),'orders',p_id::text,'transition');
end$$;
create function public.adjust_stock(p_id uuid,p_variant uuid,p_delta integer,p_reason text) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_admin() then raise exception 'Forbidden';end if;
 if p_delta=0 or abs(p_delta)>100000 or length(trim(p_reason)) not between 3 and 500 then raise exception 'Invalid adjustment';end if;
 perform 1 from products where id=p_id for update;if not found then raise exception 'Not found';end if;
 if p_variant is not null then update product_variants set stock=stock+p_delta where id=p_variant and product_id=p_id;if not found then raise exception 'Invalid variant';end if;end if;
 update products set stock=stock+p_delta where id=p_id;
 insert into inventory_movements(product_id,variant_id,delta,reason,actor_id) values(p_id,p_variant,p_delta,p_reason,auth.uid());end$$;
-- Restrict function access explicitly (Postgres otherwise grants EXECUTE to PUBLIC).
revoke all on all functions in schema public from public;
grant execute on function is_admin() to anon,authenticated;
grant execute on function consume_rate(text,integer,integer),create_order(jsonb),guest_order(text,text),submit_inquiry(text,text,text) to anon,authenticated;
grant execute on function transition_order(uuid,text,text,text),adjust_stock(uuid,uuid,integer,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-media','product-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy media_public_read on storage.objects for select using(bucket_id='product-media');
create policy media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-media' and public.is_admin() and name ~ '^[a-f0-9-]+\.(jpg|png|webp)$');
create policy media_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-media' and public.is_admin());
