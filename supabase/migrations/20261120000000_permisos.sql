-- Permisos explícitos. Los proyectos nuevos de Supabase no otorgan permisos automáticos
-- sobre tablas nuevas, así que se declaran aquí (y se quitan los que sobran en proyectos que sí los dan).
-- La RLS sigue decidiendo qué filas ve o cambia cada usuario.

grant usage on schema public to authenticated, service_role;

-- Quien no inició sesión: nada.
revoke all on public.miembros, public.tipos, public.configuracion, public.comprobantes from anon;

-- Usuarios con sesión.
revoke all on public.miembros, public.tipos, public.configuracion, public.comprobantes from authenticated;
grant select, insert, update on public.miembros, public.tipos, public.configuracion to authenticated;
grant select, insert on public.comprobantes to authenticated;

-- Backend (service role): lectura completa y estado de la planilla.
grant select, insert, update on public.miembros, public.tipos, public.configuracion, public.comprobantes to service_role;

-- Funciones usadas por las reglas, los valores por defecto y la app.
grant execute on function public.miembro_actual_id(), public.es_miembro(), public.es_admin() to authenticated, service_role;
grant execute on function public.eliminar_comprobante(uuid, text) to authenticated;
revoke execute on function public.miembro_actual_id(), public.es_miembro(), public.es_admin() from anon;
