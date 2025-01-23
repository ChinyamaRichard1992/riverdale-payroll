-- First, get your user's ID from the auth.users table
SELECT id, email FROM auth.users;

-- Then, insert the admin role (replace USER_ID with the ID you found)
INSERT INTO users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE id = 'YOUR_USER_ID_HERE';

-- Verify the user is now an admin
SELECT * FROM users WHERE role = 'admin';
