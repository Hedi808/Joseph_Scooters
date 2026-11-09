create function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),120)) on conflict do nothing;
 return new;
end$$;
revoke all on function public.on_auth_user_created() from public;
create trigger create_customer_profile after insert on auth.users for each row execute function public.on_auth_user_created();
-- Add a DB constraint so direct RPC calls cannot omit required customer fields.
alter table public.orders add constraint customer_fields_required check(
 customer ?& array['name','email','phone','address','city','governorate','postal','terms'] and
 jsonb_typeof(customer->'name')='string' and length(customer->>'name') between 3 and 120 and
 jsonb_typeof(customer->'email')='string' and length(customer->>'email') between 3 and 200 and customer->>'email' like '%@%' and
 jsonb_typeof(customer->'phone')='string' and customer->>'phone' ~ '^(\+216[ ]?)?[2459][0-9]{7}$' and
 jsonb_typeof(customer->'address')='string' and length(customer->>'address') between 8 and 300 and
 jsonb_typeof(customer->'city')='string' and length(customer->>'city') between 2 and 80 and
 jsonb_typeof(customer->'governorate')='string' and customer->>'governorate'=any(array['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Le Kef','Mahdia','La Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan']) and
 jsonb_typeof(customer->'postal')='string' and customer->>'postal' ~ '^[0-9]{4}$' and customer->'terms'='true'::jsonb and coalesce(length(customer->>'notes'),0)<=1000
);
-- Grants are explicit; policies still constrain all exposed access.
grant usage on schema public to anon,authenticated;
grant select on public.products,public.product_variants,public.product_images,public.product_compatibility,public.categories,public.shipping_rules,public.site_settings,public.banners to anon,authenticated;
grant select,insert,update,delete on public.products,public.product_variants,public.product_images,public.product_compatibility,public.categories,public.shipping_rules,public.site_settings,public.banners,public.profiles,public.addresses,public.wishlist_items to authenticated;
grant select on public.admin_memberships,public.orders,public.order_items,public.order_status_history,public.inventory_movements,public.audit_logs,public.contact_inquiries to authenticated;
