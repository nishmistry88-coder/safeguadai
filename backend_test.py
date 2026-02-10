import requests
import sys
import json
import tempfile
import os
from datetime import datetime

class SafeGuardAPITester:
    def __init__(self, base_url="https://safeguard-app-66.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if files:
                # Remove Content-Type for file uploads
                headers.pop('Content-Type', None)
                
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json() if response.content else {}
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("Health Check", "GET", "", 200)
        self.run_test("Health Status", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test user registration
        test_user = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
        else:
            print("❌ Failed to get token from registration")
            return False

        # Test get current user
        self.run_test("Get Current User", "GET", "auth/me", 200)

        # Test login with same credentials
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        success, login_response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return True

    def test_emergency_contacts(self):
        """Test emergency contacts CRUD operations"""
        print("\n=== EMERGENCY CONTACTS TESTS ===")
        
        if not self.token:
            print("❌ No auth token available for contacts tests")
            return False

        # Test get empty contacts
        self.run_test("Get Empty Contacts", "GET", "contacts", 200)

        # Test create contact
        contact_data = {
            "name": "Test Emergency Contact",
            "phone": "+1-555-123-4567",
            "relationship": "family",
            "is_primary": True
        }
        
        success, contact_response = self.run_test(
            "Create Emergency Contact",
            "POST",
            "contacts",
            200,
            data=contact_data
        )
        
        contact_id = None
        if success and 'id' in contact_response:
            contact_id = contact_response['id']
            print(f"   Contact ID: {contact_id}")

        # Test get contacts after creation
        self.run_test("Get Contacts After Creation", "GET", "contacts", 200)

        # Test update contact
        if contact_id:
            update_data = {
                "name": "Updated Emergency Contact",
                "phone": "+1-555-987-6543",
                "relationship": "friend",
                "is_primary": False
            }
            
            self.run_test(
                "Update Emergency Contact",
                "PUT",
                f"contacts/{contact_id}",
                200,
                data=update_data
            )

            # Test delete contact
            self.run_test(
                "Delete Emergency Contact",
                "DELETE",
                f"contacts/{contact_id}",
                200
            )

        return True

    def test_sos_functionality(self):
        """Test SOS alert functionality"""
        print("\n=== SOS FUNCTIONALITY TESTS ===")
        
        if not self.token:
            print("❌ No auth token available for SOS tests")
            return False

        # Test create SOS alert
        sos_data = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "message": "Test emergency alert"
        }
        
        success, sos_response = self.run_test(
            "Create SOS Alert",
            "POST",
            "sos",
            200,
            data=sos_data
        )
        
        alert_id = None
        if success and 'id' in sos_response:
            alert_id = sos_response['id']

        # Test get SOS history
        self.run_test("Get SOS History", "GET", "sos/history", 200)

        # Test resolve SOS alert
        if alert_id:
            self.run_test(
                "Resolve SOS Alert",
                "PUT",
                f"sos/{alert_id}/resolve",
                200
            )

        return True

    def test_location_tracking(self):
        """Test location tracking functionality"""
        print("\n=== LOCATION TRACKING TESTS ===")
        
        if not self.token:
            print("❌ No auth token available for location tests")
            return False

        # Test save location
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        self.run_test(
            "Save Location",
            "POST",
            "location",
            200,
            data=location_data
        )

        # Test get location history
        self.run_test("Get Location History", "GET", "location/history", 200)

        return True

    def test_fake_call_contacts(self):
        """Test fake call contacts functionality"""
        print("\n=== FAKE CALL CONTACTS TESTS ===")
        
        if not self.token:
            print("❌ No auth token available for fake call tests")
            return False

        # Test get empty fake call contacts
        self.run_test("Get Empty Fake Call Contacts", "GET", "fake-call-contacts", 200)

        # Test create fake call contact
        fake_contact_data = {
            "name": "Mom",
            "phone": "+1-555-MOM-CALL"
        }
        
        success, fake_contact_response = self.run_test(
            "Create Fake Call Contact",
            "POST",
            "fake-call-contacts",
            200,
            data=fake_contact_data
        )
        
        fake_contact_id = None
        if success and 'id' in fake_contact_response:
            fake_contact_id = fake_contact_response['id']

        # Test get fake call contacts after creation
        self.run_test("Get Fake Call Contacts After Creation", "GET", "fake-call-contacts", 200)

        # Test delete fake call contact
        if fake_contact_id:
            self.run_test(
                "Delete Fake Call Contact",
                "DELETE",
                f"fake-call-contacts/{fake_contact_id}",
                200
            )

        return True

    def test_audio_analysis(self):
        """Test audio analysis functionality"""
        print("\n=== AUDIO ANALYSIS TESTS ===")
        
        if not self.token:
            print("❌ No auth token available for audio analysis tests")
            return False

        # Create a small test audio file (webm format)
        try:
            # Create a minimal webm file for testing
            test_audio_content = b'\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04\x42\xf3\x81\x08\x42\x82\x84webm\x42\x87\x81\x02\x42\x85\x81\x02'
            
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_file:
                tmp_file.write(test_audio_content)
                tmp_file_path = tmp_file.name

            # Test audio analysis
            with open(tmp_file_path, 'rb') as audio_file:
                files = {'audio': ('test.webm', audio_file, 'audio/webm')}
                
                success, analysis_response = self.run_test(
                    "Audio Analysis",
                    "POST",
                    "analyze-audio",
                    200,
                    files=files
                )
                
                if success:
                    print(f"   Analysis result: {analysis_response.get('is_threat', 'N/A')}")

            # Clean up temp file
            os.unlink(tmp_file_path)
            
        except Exception as e:
            self.log_test("Audio Analysis", False, f"File creation error: {str(e)}")

        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SafeGuard API Tests")
        print(f"📍 Base URL: {self.base_url}")
        
        # Run test suites
        self.test_health_check()
        
        if self.test_auth_flow():
            self.test_emergency_contacts()
            self.test_sos_functionality()
            self.test_location_tracking()
            self.test_fake_call_contacts()
            self.test_audio_analysis()
        else:
            print("❌ Authentication failed - skipping protected endpoint tests")

        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SafeGuardAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())