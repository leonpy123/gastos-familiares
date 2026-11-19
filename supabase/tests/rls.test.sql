begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into public.miembros (id, email, nombre, rol) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.com', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@gmail.com', 'Ana', 'miembro'),
  ('00000000-0000-0000-0000-00000000000c', 'inactivo@test.com', 'Ina', 'miembro');
update public.miembros set activo = false where email = 'inactivo@test.com';

insert into public.comprobantes (id, clase, fecha, tipo_id, concepto, contraparte, ruc, ruc_dv, monto, creado_por)
select '10000000-0000-0000-0000-000000000001', 'gasto', '2026-11-19', id, 'almuerzo', 'supermas', '8002147', 6, 8000,
       '00000000-0000-0000-0000-00000000000a'
from public.tipos where nombre = 'Gastos hogar';

set local role authenticated;

-- Cuenta de Google que no está en miembros
set local request.jwt.claims = '{"email":"extrano@test.com"}';
select is((select count(*) from public.comprobantes)::int, 0, 'no miembro no ve comprobantes');
select is((select count(*) from public.tipos)::int, 0, 'no miembro no ve tipos');

-- Miembro, con el email en otra combinación de mayúsculas
set local request.jwt.claims = '{"email":"Ana@Gmail.com"}';
select is((select count(*) from public.comprobantes)::int, 1, 'miembro con email en mayúsculas ve comprobantes');

select lives_ok($$
  insert into public.comprobantes (id, clase, fecha, tipo_id, concepto, contraparte, ruc, ruc_dv, monto)
  select '10000000-0000-0000-0000-000000000002', 'gasto', '2026-11-19', id, 'pan', 'panaderia', '8002147', 6, 5000
  from public.tipos where nombre = 'Gastos hogar'
$$, 'miembro inserta un comprobante');

select is((select creado_por from public.comprobantes where id = '10000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000000b'::uuid, 'creado_por es el miembro actual');

select throws_ok($$
  insert into public.comprobantes (id, clase, fecha, tipo_id, concepto, contraparte, ruc, ruc_dv, monto, creado_por)
  select '10000000-0000-0000-0000-000000000003', 'gasto', '2026-11-19', id, 'pan', 'x', '8002147', 6, 5000,
         '00000000-0000-0000-0000-00000000000a'
  from public.tipos where nombre = 'Gastos hogar'
$$, '42501', null, 'miembro no puede insertar a nombre de otro');

select throws_ok($$ insert into public.tipos (clase, nombre) values ('gasto', 'Nuevo') $$,
  '42501', null, 'miembro no inserta tipos');
select throws_ok($$ insert into public.miembros (email, nombre) values ('x@y.com', 'X') $$,
  '42501', null, 'miembro no agrega miembros');

-- Admin
set local request.jwt.claims = '{"email":"admin@test.com"}';
select lives_ok($$ insert into public.tipos (clase, nombre) values ('gasto', 'Nuevo') $$, 'admin inserta tipos');
select is((select (valor->>0) from public.configuracion where clave = 'separadores_dictado'), 'tab',
  'configuración inicial de separadores');

-- Miembro desactivado
set local request.jwt.claims = '{"email":"inactivo@test.com"}';
select is((select count(*) from public.comprobantes)::int, 0, 'miembro inactivo no ve nada');

select * from finish();
rollback;
