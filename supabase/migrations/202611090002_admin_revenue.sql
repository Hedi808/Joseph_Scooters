create function public.admin_revenue() returns bigint language plpgsql stable security definer set search_path=public as $$begin if not is_admin() then raise exception 'Forbidden';end if;return(select coalesce(sum(total_millimes),0)::bigint from orders where payment_status='paid' and status<>'cancelled');end$$;
revoke all on function public.admin_revenue() from public;
grant execute on function public.admin_revenue() to authenticated;
