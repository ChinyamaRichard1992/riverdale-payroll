-- First, create a new user in the auth.users table
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',  -- instance_id
    uuid_generate_v4(),                       -- id (this will be your admin user's ID)
    'authenticated',                          -- aud
    'authenticated',                          -- role
    'admin@riverdale.edu',                   -- replace with your admin email
    crypt('your-password-here', gen_salt('bf')), -- replace with your desired password
    now(),                                   -- email_confirmed_at
    now(),                                   -- created_at
    now(),                                   -- updated_at
    now()                                    -- last_sign_in_at
)
RETURNING id;  -- This will show you the created user's ID

-- Then, make this user an admin in our users table
INSERT INTO public.users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@riverdale.edu';  -- make sure this matches the email you used above

-- Verify the admin user was created
SELECT * FROM public.users WHERE role = 'admin';
