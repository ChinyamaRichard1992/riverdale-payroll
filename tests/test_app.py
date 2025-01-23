import unittest
import os
import sys
import json
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app

class TestPayrollApp(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        
    def test_index_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
    def test_login_page(self):
        response = self.client.get('/login')
        self.assertEqual(response.status_code, 200)
        
    def test_unauthorized_access(self):
        response = self.client.get('/work')
        self.assertEqual(response.status_code, 302)  # Should redirect to login
        
    def test_404_error(self):
        response = self.client.get('/nonexistent')
        self.assertEqual(response.status_code, 404)
        
    def test_login_invalid_credentials(self):
        response = self.client.post('/login', 
            json={'email': 'test@test.com', 'password': 'wrongpassword'})
        self.assertEqual(response.status_code, 401)
        
    def test_api_endpoints_unauthorized(self):
        endpoints = ['/api/employees', '/api/payslips', '/api/user-role']
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 302)  # Should redirect to login

if __name__ == '__main__':
    unittest.main()
