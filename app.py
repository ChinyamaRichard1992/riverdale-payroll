from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from supabase import create_client
import os
import logging
from functools import wraps
from datetime import datetime, timezone
import json
from middleware import log_performance

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
    static_url_path='/static',
    static_folder='static',
    template_folder='templates'
)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key')

# Debug: Print environment variables
logger.info("Environment Variables:")
logger.info(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")
logger.info(f"SUPABASE_KEY: {'*' * 10 if os.environ.get('SUPABASE_KEY') else 'Not Set'}")

# Initialize Supabase client with error handling
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')

if not supabase_url:
    logger.error("SUPABASE_URL environment variable is not set")
    raise ValueError("SUPABASE_URL environment variable is not set")
if not supabase_key:
    logger.error("SUPABASE_KEY environment variable is not set")
    raise ValueError("SUPABASE_KEY environment variable is not set")

try:
    supabase = create_client(supabase_url, supabase_key)
    logger.info("Successfully connected to Supabase")
except Exception as e:
    logger.error(f"Error creating Supabase client: {str(e)}")
    raise

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            logger.warning(f"Unauthorized access attempt to {request.path}")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or session['user'].get('role') != 'admin':
            logger.warning(f"Non-admin access attempt to {request.path} by user {session.get('user', {}).get('email')}")
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 error: {request.url}")
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {str(error)}")
    return render_template('500.html'), 500

@app.route('/')
@log_performance()
def index():
    logger.info("Rendering index.html")
    return render_template('index.html')

@app.route('/work')
@login_required
@log_performance()
def work():
    logger.info("Rendering work.html")
    return render_template('work.html')

@app.route('/login', methods=['GET', 'POST'])
@log_performance()
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
            
            logger.info(f"Successful login for user: {email}")
            return jsonify({'success': True, 'role': user_response.data.get('role')})
        except Exception as e:
            logger.error(f"Login error for user {email}: {str(e)}")
            return jsonify({'error': str(e)}), 401
            
    logger.info("Rendering login.html")
    return render_template('login.html')

@app.route('/callback')
@log_performance()
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
            
            logger.info(f"Successful callback for user: {user.email}")
            return redirect(url_for('work'))
        except Exception as e:
            logger.error(f"Callback error: {str(e)}")
            return redirect(url_for('login'))
    return redirect(url_for('login'))

@app.route('/logout')
@log_performance()
def logout():
    session.clear()
    logger.info("User logged out")
    return redirect(url_for('index'))

@app.route('/api/user-role')
@login_required
@log_performance()
def get_user_role():
    logger.info("Getting user role")
    return jsonify({'role': session['user'].get('role', 'viewer')})

@app.route('/api/employees', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
@log_performance()
def handle_employees():
    if request.method == 'GET':
        try:
            response = supabase.from_('employees').select('*').execute()
            logger.info("Successfully retrieved employees")
            return jsonify(response.data)
        except Exception as e:
            logger.error(f"GET employees error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'POST':
        if session['user'].get('role') != 'admin':
            logger.warning(f"Non-admin access attempt to create employee by user {session.get('user', {}).get('email')}")
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            data = request.get_json()
            data['created_by'] = session['user']['id']
            response = supabase.from_('employees').insert(data).execute()
            logger.info(f"Successfully created employee: {data.get('name')}")
            return jsonify(response.data)
        except Exception as e:
            logger.error(f"POST employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'PUT':
        if session['user'].get('role') != 'admin':
            logger.warning(f"Non-admin access attempt to update employee by user {session.get('user', {}).get('email')}")
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            data = request.get_json()
            employee_id = data.pop('id')
            data['updated_at'] = datetime.now(timezone.utc).isoformat()
            response = supabase.from_('employees').update(data).eq('id', employee_id).execute()
            logger.info(f"Successfully updated employee: {employee_id}")
            return jsonify(response.data)
        except Exception as e:
            logger.error(f"PUT employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'DELETE':
        if session['user'].get('role') != 'admin':
            logger.warning(f"Non-admin access attempt to delete employee by user {session.get('user', {}).get('email')}")
            return jsonify({'error': 'Admin access required'}), 403
            
        try:
            employee_id = request.args.get('id')
            response = supabase.from_('employees').delete().eq('id', employee_id).execute()
            logger.info(f"Successfully deleted employee: {employee_id}")
            return jsonify({'success': True})
        except Exception as e:
            logger.error(f"DELETE employee error: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/api/payslips', methods=['GET', 'POST'])
@login_required
@log_performance()
def handle_payslips():
    if request.method == 'GET':
        try:
            response = supabase.from_('payslips').select('*').execute()
            logger.info("Successfully retrieved payslips")
            return jsonify(response.data)
        except Exception as e:
            logger.error(f"GET payslips error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    if request.method == 'POST':
        try:
            data = request.get_json()
            data['date'] = datetime.now(timezone.utc).isoformat()
            response = supabase.from_('payslips').insert([data]).execute()
            logger.info(f"Successfully created payslip: {data.get('employee_id')}")
            return jsonify(response.data[0])
        except Exception as e:
            logger.error(f"POST payslip error: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/health')
@log_performance()
def health_check():
    try:
        # Test database connection
        supabase.from_('users').select('count', count='exact').execute()
        
        health_data = {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '1.0.0',
            'database': 'connected',
            'environment': os.environ.get('FLASK_ENV', 'production')
        }
        logger.info(f"Health check passed: {health_data}")
        return jsonify(health_data)
    except Exception as e:
        error_data = {
            'status': 'unhealthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(e)
        }
        logger.error(f"Health check failed: {error_data}")
        return jsonify(error_data), 500

@app.route('/metrics')
@admin_required
@log_performance()
def metrics():
    try:
        # Get various metrics
        users_count = supabase.from_('users').select('count', count='exact').execute()
        employees_count = supabase.from_('employees').select('count', count='exact').execute()
        payslips_count = supabase.from_('payslips').select('count', count='exact').execute()
        
        # Get recent activity
        recent_payslips = supabase.from_('payslips').select('*').order('date', desc=True).limit(5).execute()
        
        metrics_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'counts': {
                'users': users_count.count,
                'employees': employees_count.count,
                'payslips': payslips_count.count
            },
            'recent_activity': {
                'payslips': [
                    {
                        'id': p['id'],
                        'employee_id': p['employee_id'],
                        'date': p['date']
                    } for p in recent_payslips.data
                ]
            }
        }
        
        logger.info("Metrics retrieved successfully")
        return jsonify(metrics_data)
    except Exception as e:
        logger.error(f"Error retrieving metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
