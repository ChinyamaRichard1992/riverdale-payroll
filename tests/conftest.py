import pytest
import os

@pytest.fixture(autouse=True)
def setup_test_env():
    """Set up test environment variables"""
    os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
    os.environ['SUPABASE_KEY'] = 'test-key'
    os.environ['FLASK_SECRET_KEY'] = 'test-secret-key'
    os.environ['FLASK_ENV'] = 'testing'
