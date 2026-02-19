"""
Pytest configuration and fixtures for SafeGuard API tests
"""

import pytest
import os

# Set the REACT_APP_BACKEND_URL if not set
def pytest_configure(config):
    if not os.environ.get('REACT_APP_BACKEND_URL'):
        os.environ['REACT_APP_BACKEND_URL'] = 'https://sos-mobile-1.preview.emergentagent.com'
