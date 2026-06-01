
-- ============================================================
-- 1. Helpers de updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. Enums
-- ============================================================
create type public.app_role as enum ('owner', 'admin', 'staff', 'platform_admin');
create type public.order_status as enum ('novo','aceito','preparo','saiu_entrega','pronto_retirada','servido','finalizado','cancelado');
create type public.payment_status as enum ('pending','approved','rejected','refunded','manual');
create type public.order_mode as enum ('entrega','retirada','consumo_local');
create type public.tenant_status as enum ('ativa','teste','suspensa');

-- ============================================================
-- 3. tenants (lojas)
-- ============================================================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text default '',
  whatsapp text not null default '',
  city text default '',
  state text default '',
  address text default '',
  open boolean not null default true,
  prep_time text default '',
  min_order numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  hours text default '',
  logo_url text,
  logo_letter text default '',
  theme_from text default '#FF6A1F',
  theme_to text default '#FF9A3C',
  plan text not null default 'start',
  status public.tenant_status not null default 'ativa',
  social jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
create index tenants_slug_idx on public.tenants(slug);

grant select on public.tenants to anon;
grant select, insert, update, delete on public.tenants to authenticated;
grant all on public.tenants to service_role;

alter table public.tenants enable row level security;

-- ============================================================
-- 4. profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  full_name text default '',
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

-- ============================================================
-- 5. user_roles
-- ============================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- ============================================================
-- 6. Security definer helpers
-- ============================================================
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.has_tenant_role(_user_id uuid, _tenant_id uuid, _roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and tenant_id = _tenant_id
      and role = any(_roles)
  );
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(auth.uid(), 'platform_admin');
$$;

-- ============================================================
-- 7. Trigger: auto-cria profile no signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 8. categories
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create index categories_tenant_idx on public.categories(tenant_id);

grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

alter table public.categories enable row level security;

-- ============================================================
-- 9. products
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  promo_price numeric(10,2),
  image_url text,
  available boolean not null default true,
  featured boolean not null default false,
  prep_time text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create index products_tenant_idx on public.products(tenant_id);
create index products_category_idx on public.products(category_id);

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;

alter table public.products enable row level security;

-- ============================================================
-- 10. product_addons
-- ============================================================
create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_addons_product_idx on public.product_addons(product_id);

grant select on public.product_addons to anon;
grant select, insert, update, delete on public.product_addons to authenticated;
grant all on public.product_addons to service_role;

alter table public.product_addons enable row level security;

-- ============================================================
-- 11. orders + sequência numero-por-tenant
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number int not null,
  customer_name text not null,
  whatsapp text not null,
  mode public.order_mode not null,
  status public.order_status not null default 'novo',
  payment_status public.payment_status not null default 'pending',
  payment_label text not null default '',
  change_for numeric(10,2),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  address jsonb,
  table_label text,
  pickup_time text,
  note text,
  cancel_reason text,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create index orders_tenant_idx on public.orders(tenant_id, created_at desc);
create index orders_status_idx on public.orders(tenant_id, status);

-- gera número sequencial por tenant
create or replace function public.set_order_number()
returns trigger language plpgsql as $$
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
create trigger orders_set_number before insert on public.orders
  for each row execute function public.set_order_number();

grant select, insert, update, delete on public.orders to authenticated;
grant insert, select on public.orders to anon;
grant all on public.orders to service_role;

alter table public.orders enable row level security;

-- ============================================================
-- 12. order_items
-- ============================================================
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  qty int not null default 1,
  unit_price numeric(10,2) not null,
  addons jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);

grant select, insert, update, delete on public.order_items to authenticated;
grant insert, select on public.order_items to anon;
grant all on public.order_items to service_role;

alter table public.order_items enable row level security;

-- ============================================================
-- 13. order_status_history
-- ============================================================
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history(order_id, created_at);

grant select, insert on public.order_status_history to authenticated;
grant select, insert on public.order_status_history to anon;
grant all on public.order_status_history to service_role;

alter table public.order_status_history enable row level security;

-- ============================================================
-- 14. RLS POLICIES
-- ============================================================

-- tenants
create policy "tenants: anyone reads active stores"
  on public.tenants for select to anon, authenticated
  using (active = true);
create policy "tenants: owners/admins update own"
  on public.tenants for update to authenticated
  using (public.has_tenant_role(auth.uid(), id, array['owner','admin']::public.app_role[]) or public.is_platform_admin())
  with check (public.has_tenant_role(auth.uid(), id, array['owner','admin']::public.app_role[]) or public.is_platform_admin());
create policy "tenants: platform admin inserts"
  on public.tenants for insert to authenticated
  with check (public.is_platform_admin());
create policy "tenants: platform admin deletes"
  on public.tenants for delete to authenticated
  using (public.is_platform_admin());

-- profiles
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "profiles: insert own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- user_roles
create policy "user_roles: read own"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- categories
create policy "categories: anyone reads active"
  on public.categories for select to anon, authenticated
  using (active = true);
create policy "categories: tenant staff manages"
  on public.categories for all to authenticated
  using (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  with check (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin());

-- products
create policy "products: anyone reads available"
  on public.products for select to anon, authenticated
  using (available = true);
create policy "products: tenant staff manages"
  on public.products for all to authenticated
  using (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  with check (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin());

-- product_addons
create policy "product_addons: anyone reads"
  on public.product_addons for select to anon, authenticated
  using (true);
create policy "product_addons: tenant staff manages"
  on public.product_addons for all to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_addons.product_id
      and (public.has_tenant_role(auth.uid(), p.tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = product_addons.product_id
      and (public.has_tenant_role(auth.uid(), p.tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  ));

-- orders
create policy "orders: customers insert"
  on public.orders for insert to anon, authenticated
  with check (true);
create policy "orders: customer reads by id"
  on public.orders for select to anon, authenticated
  using (true);
create policy "orders: tenant staff updates"
  on public.orders for update to authenticated
  using (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  with check (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin());
create policy "orders: tenant staff deletes"
  on public.orders for delete to authenticated
  using (public.has_tenant_role(auth.uid(), tenant_id, array['owner','admin']::public.app_role[]) or public.is_platform_admin());

-- order_items
create policy "order_items: anyone reads"
  on public.order_items for select to anon, authenticated
  using (true);
create policy "order_items: anyone inserts on create"
  on public.order_items for insert to anon, authenticated
  with check (true);
create policy "order_items: tenant staff manages"
  on public.order_items for update to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (public.has_tenant_role(auth.uid(), o.tenant_id, array['owner','admin','staff']::public.app_role[]) or public.is_platform_admin())
  ))
  with check (true);

-- order_status_history
create policy "order_status_history: anyone reads"
  on public.order_status_history for select to anon, authenticated
  using (true);
create policy "order_status_history: anyone inserts"
  on public.order_status_history for insert to anon, authenticated
  with check (true);

-- ============================================================
-- 15. realtime
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
alter table public.orders replica identity full;
alter table public.order_status_history replica identity full;
