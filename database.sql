-- Enable the UUID extension
create extension if not exists "uuid-ossp";

-- Create employees table
create table if not exists employees (
    id uuid default uuid_generate_v4() primary key,
    employee_id text unique not null,
    name text not null,
    nrc text unique not null,
    department text,
    position text,
    employment_type text,
    grade_level text,
    date_joined date,
    qualifications text,
    working_hours integer,
    grade_taught text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

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
alter table employees enable row level security;
alter table payslips enable row level security;

-- Create policies that allow all operations (for now)
create policy "Enable all operations for employees"
    on employees for all
    using (true)
    with check (true);

create policy "Enable all operations for payslips"
    on payslips for all
    using (true)
    with check (true);
