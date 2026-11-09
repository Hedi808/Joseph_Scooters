create index products_flexible_specs on public.products using gin(specifications);
create index variants_color on public.product_variants(color,product_id);
create index products_wheel_weight on public.products(wheel_inches,weight_kg);
create index products_brakes on public.products((specifications->>'Freins')) where status='published';
create index products_suspension on public.products((specifications->>'Suspension')) where status='published';
create index products_usage on public.products((specifications->>'Usage')) where status='published';
alter table public.shipping_rules add constraint bounded_shipping_amount check(fee_millimes<=1000000000);
alter table public.categories add constraint category_not_own_parent check(parent_id is distinct from id);
