-- Gastos Familiares: esquema, reglas de acceso e inmutabilidad

-- ───────────── Tablas ─────────────
create table public.miembros (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique check (email = lower(email)),
  nombre     text not null,
  rol        text not null default 'miembro' check (rol in ('admin', 'miembro')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table public.tipos (
  id             uuid primary key default gen_random_uuid(),
  clase          text not null check (clase in ('ingreso', 'gasto')),
  nombre         text not null check (length(trim(nombre)) > 0),
  palabras_clave text[] not null default '{}',
  activo         boolean not null default true
);
create unique index tipos_clase_nombre_uk on public.tipos (clase, lower(nombre));

create table public.configuracion (
  clave text primary key,
  valor jsonb not null
);

-- ───────────── Funciones de identidad ─────────────
create or replace function public.miembro_actual_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.miembros
  where email = lower(auth.jwt() ->> 'email') and activo
$$;

create or replace function public.es_miembro() returns boolean
language sql stable security definer set search_path = public as $$
  select public.miembro_actual_id() is not null
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros
    where email = lower(auth.jwt() ->> 'email') and activo and rol = 'admin'
  )
$$;

create table public.comprobantes (
  id                 uuid primary key, -- lo genera el cliente (idempotencia)
  clase              text not null check (clase in ('ingreso', 'gasto')),
  fecha              date not null,
  tipo_id            uuid not null references public.tipos (id),
  concepto           text not null check (length(trim(concepto)) between 1 and 200),
  contraparte        text not null check (length(trim(contraparte)) between 1 and 200),
  ruc                text not null check (ruc ~ '^[0-9]{5,9}$'),
  ruc_dv             smallint not null check (ruc_dv between 0 and 9),
  monto              bigint not null check (monto > 0 and monto <= 999999999999),
  creado_por         uuid not null default public.miembro_actual_id() references public.miembros (id),
  creado_en          timestamptz not null default now(),
  eliminado_en       timestamptz,
  eliminado_por      uuid references public.miembros (id),
  motivo_eliminacion text
);
create index comprobantes_fecha_idx on public.comprobantes (fecha);
create index comprobantes_ruc_idx on public.comprobantes (ruc, creado_en desc);

-- ───────────── Inmutabilidad ─────────────
create or replace function public.proteger_comprobante() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'los comprobantes no se borran; usar eliminar_comprobante';
  end if;
  if old.eliminado_en is not null then
    raise exception 'el comprobante ya está eliminado';
  end if;
  if (new.id, new.clase, new.fecha, new.tipo_id, new.concepto, new.contraparte,
      new.ruc, new.ruc_dv, new.monto, new.creado_por, new.creado_en)
     is distinct from
     (old.id, old.clase, old.fecha, old.tipo_id, old.concepto, old.contraparte,
      old.ruc, old.ruc_dv, old.monto, old.creado_por, old.creado_en) then
    raise exception 'los comprobantes guardados no se pueden modificar';
  end if;
  return new;
end
$$;

create trigger proteger_comprobante
  before update or delete on public.comprobantes
  for each row execute function public.proteger_comprobante();

create or replace function public.eliminar_comprobante(p_id uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'solo el administrador puede eliminar';
  end if;
  if not exists (select 1 from public.comprobantes where id = p_id) then
    raise exception 'comprobante inexistente';
  end if;
  if exists (select 1 from public.comprobantes where id = p_id and eliminado_en is not null) then
    raise exception 'el comprobante ya está eliminado';
  end if;
  update public.comprobantes
     set eliminado_en = now(),
         eliminado_por = public.miembro_actual_id(),
         motivo_eliminacion = nullif(trim(p_motivo), '')
   where id = p_id;
end
$$;

revoke execute on function public.eliminar_comprobante(uuid, text) from public, anon;
grant execute on function public.eliminar_comprobante(uuid, text) to authenticated;

-- ───────────── Row Level Security ─────────────
alter table public.miembros      enable row level security;
alter table public.tipos         enable row level security;
alter table public.configuracion enable row level security;
alter table public.comprobantes  enable row level security;

create policy miembros_select on public.miembros for select to authenticated using (public.es_miembro());
create policy miembros_insert on public.miembros for insert to authenticated with check (public.es_admin());
create policy miembros_update on public.miembros for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy tipos_select on public.tipos for select to authenticated using (public.es_miembro());
create policy tipos_insert on public.tipos for insert to authenticated with check (public.es_admin());
create policy tipos_update on public.tipos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy configuracion_select on public.configuracion for select to authenticated using (public.es_miembro());
create policy configuracion_insert on public.configuracion for insert to authenticated with check (public.es_admin());
create policy configuracion_update on public.configuracion for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy comprobantes_select on public.comprobantes for select to authenticated using (public.es_miembro());
create policy comprobantes_insert on public.comprobantes for insert to authenticated
  with check (
    public.es_miembro()
    and creado_por = public.miembro_actual_id()
    and eliminado_en is null
    and eliminado_por is null
  );

-- ───────────── Datos iniciales ─────────────
insert into public.tipos (clase, nombre, palabras_clave) values
  ('gasto',   'Gastos hogar', '{hogar,gastos hogar}'),
  ('gasto',   'Préstamos',    '{prestamo,prestamos}'),
  ('gasto',   'Aportes',      '{aporte,aportes}'),
  ('gasto',   'Diezmos',      '{diezmo,diezmos}'),
  ('ingreso', 'Sueldos',      '{sueldo,sueldos}'),
  ('ingreso', 'Otros',        '{otro,otros}');

insert into public.configuracion (clave, valor) values
  ('separadores_dictado', '["tab", "tap"]'),
  ('planilla', '{"pendiente": false, "ultima_sync": null, "ultimo_error": null}');
