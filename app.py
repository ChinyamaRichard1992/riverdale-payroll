from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from supabase import create_client
import os
from functools import wraps
from datetime import datetime, timezone
import json

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key')

# Debug: Print environment variables
print("Environment Variables:")
print(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")
print(f"SUPABASE_KEY: {os.environ.get('SUPABASE_KEY')}")

# Initialize Supabase client with error handling
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')

if not supabase_url:
    raise ValueError("SUPABASE_URL environment variable is not set")
if not supabase_key:
    raise ValueError("SUPABASE_KEY environment variable is not set")

try:
    supabase = create_client(supabase_url, supabase_key)
except Exception as e:
    print(f"Error creating Supabase client: {str(e)}")
    raise

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or session['user'].get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/work')
@login_required
def work():
    return render_template('work.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            user_response = supabase.from_('users').select('*').eq('id', auth_response.user.id).single()
            
            session['user'] = {
                'id': auth_response.user.id,
                'email': email,
                'role': user_response.data.get('role', 'viewer')
            }
            
            return jsonify({'success': True, 'role': user_response.data.get('role')})
        except Exception as e:
            print(f"Login error: {str(e)}")
            return jsonify({'error': str(e)}), 401
            
    return render_template('login.html')

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if code:
        try:
            # Exchange code for session
            session = supabase.auth.exchange_code_for_session(code)
            user = session.user
            
            # Get user role from our users table
            user_response = supabase.from_('users').select('*').eq('id', user.id).single()
            
            session['user'] = {
                'id': user.id,
                'email': user.email,
                'role': user_response.data.get('role', 'viewer')
            }
            
            return redirect(url_for('work'))
        except Exception as e:
            print(f"Callback error: {str(e)}")
            return redirect(url_for('login'))
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/api/user-role')
@login_required
def get_user_role():
    return jsonify({'role': session['user'].get('role', 'viewer')})

@app.route('/api/employees', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
def handle_employees():
    if request.method == 'GET':
        try:
            response = supabase.from_('employees').select('*').execute()
            return jsonify(response.data)
        except Exception as e:
            print(f"GET employees error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'POST':
        if session['user'].get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            data = request.get_json()
            data['created_by'] = session['user']['id']
            response = supabase.from_('employees').insert(data).execute()
            return jsonify(response.data)
        except Exception as e:
            print(f"POST employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'PUT':
        if session['user'].get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            data = request.get_json()
            employee_id = data.pop('id')
            data['updated_at'] = datetime.now(timezone.utc).isoformat()
            response = supabase.from_('employees').update(data).eq('id', employee_id).execute()
            return jsonify(response.data)
        except Exception as e:
            print(f"PUT employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'DELETE':
        if session['user'].get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            employee_id = request.args.get('id')
            response = supabase.from_('employees').delete().eq('id', employee_id).execute()
            return jsonify({'success': True})
        except Exception as e:
            print(f"DELETE employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/api/payslips', methods=['GET', 'POST'])
@login_required
def handle_payslips():
    if request.method == 'GET':
        try:
            response = supabase.from_('payslips').select('*').execute()
            return jsonify(response.data)
        except Exception as e:
            print(f"GET payslips error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'POST':
        try:
            data = request.get_json()
            data['date'] = datetime.now(timezone.utc).isoformat()
            response = supabase.from_('payslips').insert([data]).execute()
            return jsonify(response.data[0])
        except Exception as e:
            print(f"POST payslip error: {str(e)}")
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
