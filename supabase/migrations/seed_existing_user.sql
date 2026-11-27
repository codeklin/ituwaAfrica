-- Seed an existing Supabase auth user into the profiles table.
--
-- HOW TO USE:
--   1. Go to Supabase → Authentication → Users
--   2. Copy the UUID of your user
--   3. Replace <YOUR_USER_UUID> below with that UUID
--   4. Update the email and full_name to match
--   5. Leave role as 'learner' (or change to 'admin' ONLY for administrator accounts)
--   6. Run in the SQL Editor

insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  'learner'         -- default to 'learner'; change to 'admin' ONLY for platform administrators
from auth.users
where id = '<YOUR_USER_UUID>'   -- ← paste your UUID here
on conflict (id) do update
  set
    email      = excluded.email,
    full_name  = excluded.full_name,
    role       = excluded.role,
    updated_at = now();
