
INSERT INTO public.profiles (id, full_name, email, role, status)
VALUES 
  ('b68e9c39-372d-457d-848d-f9e2e4e2c681', 'Chandra', 'chandra@pinsar.id', 'superadmin', 'approved'),
  ('9d19626a-eafb-437a-9fe1-6a64356ec228', 'Alda', 'alda@pinsar.id', 'superadmin', 'approved')
ON CONFLICT (id) DO UPDATE SET role = 'superadmin', status = 'approved';

INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('b68e9c39-372d-457d-848d-f9e2e4e2c681', 'superadmin'),
  ('9d19626a-eafb-437a-9fe1-6a64356ec228', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;
