# Riverdale Academy Payroll System

A modern web-based payroll management system for Riverdale Academy and Day Care.

## Features
- Employee management
- Payroll calculation
- Payslip generation
- QR code integration
- Secure data storage with Supabase

## Setup Instructions

1. Create a Supabase account and project at https://supabase.com
2. Create the following tables in your Supabase database:

```sql
-- employees table
create table employees (
  id uuid default uuid_generate_v4() primary key,
  employee_id text not null,
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

-- payslips table
create table payslips (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references employees(id),
  date timestamp with time zone default timezone('utc'::text, now()),
  basic_salary numeric,
  allowances numeric,
  deductions numeric,
  net_salary numeric,
  html text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

3. Copy your Supabase URL and anon key from your project settings
4. Create a `.env` file with your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

5. Install dependencies:
```bash
pip install -r requirements.txt
```

6. Run the application:
```bash
python app.py
```

## Deployment

This application is ready to be deployed to platforms like Heroku:

1. Create a new Heroku app
2. Set the following config vars in Heroku:
   - SUPABASE_URL
   - SUPABASE_KEY
3. Deploy using Git:
```bash
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

## Security
- All data is stored securely in Supabase
- Database access is controlled through Row Level Security (RLS)
- Sensitive information is never exposed to the client
