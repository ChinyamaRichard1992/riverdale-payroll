import pytest
from app import create_app
from flask import session

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app({
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key',
    })
    return app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

def test_index(client):
    """Test the index page."""
    response = client.get('/')
    assert response.status_code == 200

def test_work_redirect_if_not_logged_in(client):
    """Test that the work page redirects if not logged in."""
    response = client.get('/work')
    assert response.status_code == 302
    assert '/login' in response.headers['Location']

def test_work_access_if_logged_in(client):
    """Test that the work page is accessible when logged in."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'viewer'}
    response = client.get('/work')
    assert response.status_code == 200

def test_login_get(client):
    """Test the login page."""
    response = client.get('/login')
    assert response.status_code == 200

def test_login_post_success_admin(client):
    """Test successful admin login."""
    response = client.post('/login', json={
        'email': 'admin@test.com',
        'password': 'password'
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['success'] is True
    assert json_data['role'] == 'admin'

def test_login_post_success_viewer(client):
    """Test successful viewer login."""
    response = client.post('/login', json={
        'email': 'viewer@test.com',
        'password': 'password'
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['success'] is True
    assert json_data['role'] == 'viewer'

def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['status'] == 'healthy'
    assert 'timestamp' in json_data
    assert json_data['database'] == 'not connected'
    assert json_data['environment'] == 'testing'

def test_metrics_unauthorized(client):
    """Test that metrics endpoint requires admin access."""
    response = client.get('/metrics')
    assert response.status_code == 403

def test_metrics_authorized(client):
    """Test metrics endpoint with admin access."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'admin'}
    response = client.get('/metrics')
    assert response.status_code == 200
    json_data = response.get_json()
    assert 'counts' in json_data
    assert 'recent_activity' in json_data

def test_employees_get(client):
    """Test getting employees list."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'viewer'}
    response = client.get('/api/employees')
    assert response.status_code == 200
    assert response.get_json() == []

def test_employees_post_unauthorized(client):
    """Test that creating employees requires admin access."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'viewer'}
    response = client.post('/api/employees', json={
        'name': 'Test Employee',
        'position': 'Tester'
    })
    assert response.status_code == 403

def test_employees_post_authorized(client):
    """Test creating employees with admin access."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'admin'}
    response = client.post('/api/employees', json={
        'name': 'Test Employee',
        'position': 'Tester'
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert 'id' in json_data[0]

def test_payslips_get(client):
    """Test getting payslips list."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'viewer'}
    response = client.get('/api/payslips')
    assert response.status_code == 200
    assert response.get_json() == []

def test_payslips_post(client):
    """Test creating a payslip."""
    with client.session_transaction() as sess:
        sess['user'] = {'id': 'test-id', 'email': 'test@test.com', 'role': 'viewer'}
    response = client.post('/api/payslips', json={
        'employee_id': 'test-employee-id',
        'amount': 1000
    })
    assert response.status_code == 200
    json_data = response.get_json()
    assert 'id' in json_data
