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

def create_app(test_config=None):
    app = Flask(__name__, 
        static_url_path='/static',
        static_folder='static',
        template_folder='templates'
    )
    
    if test_config is None:
        # Load the instance config, if it exists, when not testing
        app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key')
        
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
            app.supabase = create_client(supabase_url, supabase_key)
            logger.info("Successfully connected to Supabase")
        except Exception as e:
            logger.error(f"Error creating Supabase client: {str(e)}")
            raise
    else:
        # Load the test config if passed in
        app.config.update(test_config)
        app.secret_key = test_config.get('SECRET_KEY', 'test-secret-key')
        app.supabase = None
        logger.info("Running in test mode without Supabase")
    
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
        if 'user' in session:
            return redirect(url_for('work'))
        return redirect(url_for('login'))

    @app.route('/work')
    @login_required
    @log_performance()
    def work():
        logger.info("Rendering work.html")
        return render_template('work.html')
    
    @app.route('/login', methods=['GET', 'POST'])
    @log_performance()
    def login():
        if request.method == 'GET':
            if 'user' in session:
                return redirect(url_for('work'))
            return render_template('login.html')
            
        if request.method == 'POST':
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            
            try:
                if app.supabase:
                    auth_response = app.supabase.auth.sign_in_with_password({
                        "email": email,
                        "password": password
                    })
                    
                    # Get user role from the users table
                    user_response = app.supabase.from_('users').select('role').eq('id', auth_response.user.id).execute()
                    role = user_response.data[0]['role'] if user_response.data else 'viewer'
                    
                    session['user'] = {
                        'id': auth_response.user.id,
                        'email': email,
                        'role': role
                    }
                else:
                    # For testing
                    session['user'] = {
                        'id': 'test-user-id',
                        'email': email,
                        'role': 'admin' if email == 'admin@example.com' else 'viewer'
                    }
                
                logger.info(f"Successful login for user: {email}")
                return jsonify({'success': True})
            except Exception as e:
                logger.error(f"Login error for user {email}: {str(e)}")
                return jsonify({'error': str(e)}), 401
                
    @app.route('/callback')
    @log_performance()
    def callback():
        code = request.args.get('code')
        if code:
            try:
                # Exchange code for session
                if app.supabase:
                    session = app.supabase.auth.exchange_code_for_session(code)
                    user = session.user
                    
                    # Get user role from our users table
                    user_response = app.supabase.from_('users').select('*').eq('id', user.id).single()
                    
                    session['user'] = {
                        'id': user.id,
                        'email': user.email,
                        'role': user_response.data.get('role', 'viewer')
                    }
                else:
                    # For testing, simulate successful callback
                    session['user'] = {
                        'id': 'test-user-id',
                        'email': 'test-user-email',
                        'role': 'admin'
                    }
                
                logger.info(f"Successful callback for user: {session['user']['email']}")
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
                if app.supabase:
                    response = app.supabase.from_('employees').select('*').execute()
                else:
                    # For testing, return empty list
                    response = type('Response', (), {'data': []})()
                
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
                if app.supabase:
                    response = app.supabase.from_('employees').insert(data).execute()
                else:
                    # For testing, simulate successful creation
                    response = type('Response', (), {'data': [{'id': 'test-employee-id'}]})()
                
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
                if app.supabase:
                    response = app.supabase.from_('employees').update(data).eq('id', employee_id).execute()
                else:
                    # For testing, simulate successful update
                    response = type('Response', (), {'data': [{'id': employee_id}]})()
                
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
                if app.supabase:
                    response = app.supabase.from_('employees').delete().eq('id', employee_id).execute()
                else:
                    # For testing, simulate successful deletion
                    response = type('Response', (), {'data': [{'id': employee_id}]})()
                
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
                if app.supabase:
                    response = app.supabase.from_('payslips').select('*').execute()
                else:
                    # For testing, return empty list
                    response = type('Response', (), {'data': []})()
                
                logger.info("Successfully retrieved payslips")
                return jsonify(response.data)
            except Exception as e:
                logger.error(f"GET payslips error: {str(e)}")
                return jsonify({'error': str(e)}), 500
                
        if request.method == 'POST':
            try:
                data = request.get_json()
                data['date'] = datetime.now(timezone.utc).isoformat()
                if app.supabase:
                    response = app.supabase.from_('payslips').insert([data]).execute()
                else:
                    # For testing, simulate successful creation
                    response = type('Response', (), {'data': [{'id': 'test-payslip-id'}]})()
                
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
            if app.supabase:
                app.supabase.from_('users').select('count', count='exact').execute()
            
            health_data = {
                'status': 'healthy',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'version': '1.0.0',
                'database': 'connected' if app.supabase else 'not connected',
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
            if app.supabase:
                users_count = app.supabase.from_('users').select('count', count='exact').execute()
                employees_count = app.supabase.from_('employees').select('count', count='exact').execute()
                payslips_count = app.supabase.from_('payslips').select('count', count='exact').execute()
            else:
                # For testing, return default counts
                Response = type('Response', (), {'count': 0})
                users_count = Response()
                employees_count = Response()
                payslips_count = Response()
            
            # Get recent activity
            if app.supabase:
                recent_payslips = app.supabase.from_('payslips').select('*').order('date', desc=True).limit(5).execute()
            else:
                # For testing, return empty list
                recent_payslips = type('Response', (), {'data': []})()
            
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
    
    @app.route('/signup', methods=['POST'])
    @log_performance()
    def signup():
        if request.method == 'POST':
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')
            
            try:
                if app.supabase:
                    # Create auth user
                    auth_response = app.supabase.auth.sign_up({
                        "email": email,
                        "password": password
                    })
                    
                    # Create user profile
                    user_data = {
                        'id': auth_response.user.id,
                        'email': email,
                        'name': name,
                        'role': 'viewer',  # Default role
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    
                    user_response = app.supabase.from_('users').insert(user_data).execute()
                    
                    # Auto-login the user
                    session['user'] = {
                        'id': auth_response.user.id,
                        'email': email,
                        'role': 'viewer'
                    }
                else:
                    # For testing, simulate successful signup
                    session['user'] = {
                        'id': 'test-user-id',
                        'email': email,
                        'role': 'viewer'
                    }
                
                logger.info(f"Successful signup for user: {email}")
                return jsonify({'success': True})
            except Exception as e:
                logger.error(f"Signup error for user {email}: {str(e)}")
                return jsonify({'error': str(e)}), 400
    
    @app.route('/reset-password', methods=['POST'])
    @log_performance()
    def reset_password():
        if request.method == 'POST':
            data = request.get_json()
            email = data.get('email')
            
            try:
                if app.supabase:
                    app.supabase.auth.reset_password_email(email)
                
                logger.info(f"Password reset email sent to: {email}")
                return jsonify({'success': True})
            except Exception as e:
                logger.error(f"Password reset error for {email}: {str(e)}")
                return jsonify({'error': str(e)}), 400
    
    @app.route('/update-password', methods=['POST'])
    @log_performance()
    def update_password():
        if request.method == 'POST':
            data = request.get_json()
            new_password = data.get('new_password')
            
            try:
                if app.supabase and 'user' in session:
                    app.supabase.auth.update_user({
                        "password": new_password
                    })
                    
                    logger.info(f"Password updated for user: {session['user']['email']}")
                    return jsonify({'success': True})
                else:
                    return jsonify({'error': 'Not authenticated'}), 401
            except Exception as e:
                logger.error(f"Password update error: {str(e)}")
                return jsonify({'error': str(e)}), 400
    
    return app

app = None
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
