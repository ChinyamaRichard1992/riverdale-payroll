-- Step 1: Drop existing table and policies if they exist
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Create the public.users table with UUID as primary key
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'viewer'))
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
CREATE POLICY "Allow Users to Select Their Own Records" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (id::text = auth.uid()::text);

CREATE POLICY "Allow Users to Insert Records" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow Users to Update Their Own Records" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (id::text = auth.uid()::text);

CREATE POLICY "Allow Users to Delete Their Own Records" 
ON public.users 
FOR DELETE 
TO authenticated 
USING (id::text = auth.uid()::text);

-- Step 4: Make the user an admin (run this AFTER inviting the user through the Supabase dashboard)
INSERT INTO public.users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'chinyamarichardcr@gmail.com';
