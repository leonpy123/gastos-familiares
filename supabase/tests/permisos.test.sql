begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Quien no inició sesión (anon) no tiene ningún permiso sobre las tablas de la app
select ok(not has_table_privilege('anon', 'public.comprobantes', 'SELECT'), 'anon no lee comprobantes');
select ok(not has_table_privilege('anon', 'public.miembros', 'SELECT'), 'anon no lee miembros');
select ok(not has_table_privilege('anon', 'public.tipos', 'SELECT'), 'anon no lee tipos');
select ok(not has_table_privilege('anon', 'public.configuracion', 'SELECT'), 'anon no lee configuracion');

-- Usuarios con sesión: los permisos que la RLS después filtra
select ok(has_table_privilege('authenticated', 'public.comprobantes', 'SELECT'), 'authenticated lee comprobantes');
select ok(has_table_privilege('authenticated', 'public.comprobantes', 'INSERT'), 'authenticated inserta comprobantes');
select ok(not has_table_privilege('authenticated', 'public.comprobantes', 'DELETE'), 'authenticated no borra comprobantes');
select ok(has_table_privilege('authenticated', 'public.miembros', 'SELECT,INSERT,UPDATE'), 'authenticated: miembros');
select ok(has_table_privilege('authenticated', 'public.tipos', 'SELECT,INSERT,UPDATE'), 'authenticated: tipos');
select ok(has_table_privilege('authenticated', 'public.configuracion', 'SELECT,INSERT,UPDATE'), 'authenticated: configuracion');
select ok(has_function_privilege('authenticated', 'public.es_miembro()', 'EXECUTE'), 'authenticated ejecuta es_miembro');
select ok(has_function_privilege('authenticated', 'public.eliminar_comprobante(uuid, text)', 'EXECUTE'), 'authenticated ejecuta eliminar_comprobante');

-- Backend (service role)
select ok(has_table_privilege('service_role', 'public.comprobantes', 'SELECT'), 'service_role lee comprobantes');
select ok(has_table_privilege('service_role', 'public.miembros', 'SELECT,INSERT'), 'service_role: miembros');
select ok(has_table_privilege('service_role', 'public.configuracion', 'SELECT,INSERT,UPDATE'), 'service_role: configuracion');
select ok(has_table_privilege('service_role', 'public.tipos', 'SELECT'), 'service_role lee tipos');

select * from finish();
rollback;
