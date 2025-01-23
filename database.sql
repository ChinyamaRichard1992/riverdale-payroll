-- Enable the UUID extension
create extension if not exists "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'viewer')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Only admins can insert" ON users
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    basic_pay DECIMAL(10,2),
    allowance DECIMAL(10,2),
    gross_pay DECIMAL(10,2),
    napsa DECIMAL(10,2),
    paye DECIMAL(10,2),
    net_pay DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Everyone can view employees" ON employees
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert" ON employees
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

CREATE POLICY "Only admins can update" ON employees
    FOR UPDATE USING (auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

CREATE POLICY "Only admins can delete" ON employees
    FOR DELETE USING (auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

-- Create payslips table
create table if not exists payslips (
    id uuid default uuid_generate_v4() primary key,
    employee_id text references employees(employee_id),
    date timestamp with time zone default timezone('utc'::text, now()),
    basic_salary numeric,
    allowances numeric,
    deductions numeric,
    net_salary numeric,
    html text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table payslips enable row level security;

-- Create policies that allow all operations (for now)
create policy "Enable all operations for payslips"
    on payslips for all
    using (true)
    with check (true);
