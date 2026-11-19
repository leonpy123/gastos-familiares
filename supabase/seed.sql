-- Solo para desarrollo local (producción no ejecuta este archivo).
-- Los tipos y la configuración inicial están en la migración.
insert into public.miembros (email, nombre, rol) values
  ('admin@example.com', 'Admin de prueba', 'admin'),
  ('miembro@example.com', 'Miembro de prueba', 'miembro')
on conflict (email) do nothing;
