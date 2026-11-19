begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into public.miembros (id, email, nombre, rol) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.com', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@gmail.com', 'Ana', 'miembro');

insert into public.comprobantes (id, clase, fecha, tipo_id, concepto, contraparte, ruc, ruc_dv, monto, creado_por)
select '10000000-0000-0000-0000-000000000001', 'gasto', '2026-11-19', id, 'almuerzo', 'supermas', '8002147', 6, 8000,
       '00000000-0000-0000-0000-00000000000b'
from public.tipos where nombre = 'Gastos hogar';

-- Ni siquiera el service role (que se salta la RLS) puede modificar ni borrar
set local role service_role;
select throws_ok($$ update public.comprobantes set monto = 1 where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'los comprobantes guardados no se pueden modificar', 'service role no modifica datos');
select throws_ok($$ delete from public.comprobantes where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'los comprobantes no se borran; usar eliminar_comprobante', 'no hay borrado físico');

set local role authenticated;

-- Miembro
set local request.jwt.claims = '{"email":"ana@gmail.com"}';
select throws_ok($$ select public.eliminar_comprobante('10000000-0000-0000-0000-000000000001', 'x') $$,
  'P0001', 'solo el administrador puede eliminar', 'miembro no elimina');

-- Admin: UPDATE directo no tiene política, así que no cambia nada
set local request.jwt.claims = '{"email":"admin@test.com"}';
update public.comprobantes set monto = 1 where id = '10000000-0000-0000-0000-000000000001';
select is((select monto from public.comprobantes where id = '10000000-0000-0000-0000-000000000001'), 8000::bigint,
  'admin tampoco edita con UPDATE');

select lives_ok($$ select public.eliminar_comprobante('10000000-0000-0000-0000-000000000001', 'duplicado') $$,
  'admin elimina');
select ok((select eliminado_en is not null from public.comprobantes where id = '10000000-0000-0000-0000-000000000001'),
  'queda la fecha de eliminación');
select is((select eliminado_por from public.comprobantes where id = '10000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'queda quién eliminó');
select is((select motivo_eliminacion from public.comprobantes where id = '10000000-0000-0000-0000-000000000001'),
  'duplicado', 'queda el motivo');
select throws_ok($$ select public.eliminar_comprobante('10000000-0000-0000-0000-000000000001', null) $$,
  'P0001', 'el comprobante ya está eliminado', 'segunda eliminación falla');

-- No se puede "des-eliminar"
set local role service_role;
select throws_ok($$ update public.comprobantes set eliminado_en = null where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'el comprobante ya está eliminado', 'no se puede revertir una eliminación');

select * from finish();
rollback;
