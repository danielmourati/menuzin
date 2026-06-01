
-- search_path fixo nas funções de trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_order_number()
returns trigger language plpgsql
set search_path = public
as $$
declare
  next_num int;
begin
  if new.number is not null and new.number > 0 then
    return new;
  end if;
  select coalesce(max(number), 1000) + 1 into next_num
    from public.orders where tenant_id = new.tenant_id;
  new.number = next_num;
  return new;
end;
$$;

-- revoga execução pública das security-definer (só roles autenticadas / definer)
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) from anon, public;
revoke execute on function public.current_tenant_id() from anon, public;
revoke execute on function public.is_platform_admin() from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) to authenticated, service_role;
grant execute on function public.current_tenant_id() to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
