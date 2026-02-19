"""
SafeGuard AI Backend API Tests
Tests all core endpoints including:
- Authentication (register, login, me)
- Emergency Contacts (CRUD)
- SOS Alerts
- Going Out Mode
- Journey Sharing
- User Settings
- Fake Call Contacts
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data with unique identifiers
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@safeguard.ai"
TEST_USER_PASSWORD = "test123456"
TEST_USER_NAME = "Test SafeGuard User"


class TestHealthCheck:
    """Health check endpoint tests - run first"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "SafeGuard API" in data["message"]
        print(f"✓ Root endpoint passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a test user"""
        email = f"test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        return {
            "email": email,
            "password": TEST_USER_PASSWORD,
            "token": data["access_token"],
            "user": data["user"]
        }
    
    def test_register_new_user(self):
        """Test user registration"""
        email = f"test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "securepassword123",
            "name": "New Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email
        assert data["user"]["name"] == "New Test User"
        assert "id" in data["user"]
        print(f"✓ User registration passed: {data['user']['email']}")
    
    def test_register_duplicate_email(self, registered_user):
        """Test duplicate email registration fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": registered_user["email"],
            "password": "anotherpassword",
            "name": "Duplicate User"
        })
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()
        print(f"✓ Duplicate email rejected correctly")
    
    def test_login_success(self, registered_user):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == registered_user["email"]
        print(f"✓ Login successful for: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@safeguard.ai",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "invalid" in data["detail"].lower()
        print(f"✓ Invalid login rejected correctly")
    
    def test_get_current_user(self, registered_user):
        """Test /api/auth/me endpoint"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["name"] == TEST_USER_NAME
        print(f"✓ Get current user passed: {data['email']}")
    
    def test_get_current_user_no_token(self):
        """Test /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 403 or response.status_code == 401
        print(f"✓ Unauthorized access correctly rejected")


class TestEmergencyContacts:
    """Emergency contacts CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for a test user"""
        email = f"contacts_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Contacts Test User"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
        else:
            # User may exist, try login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": TEST_USER_PASSWORD
            })
            token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_emergency_contact(self, auth_headers):
        """Test creating an emergency contact"""
        response = requests.post(f"{BASE_URL}/api/contacts", 
            headers=auth_headers,
            json={
                "name": "TEST_Emergency Contact",
                "phone": "+1234567890",
                "relationship": "Family",
                "is_primary": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Emergency Contact"
        assert data["phone"] == "+1234567890"
        assert data["relationship"] == "Family"
        assert data["is_primary"] == True
        assert "id" in data
        print(f"✓ Emergency contact created: {data['name']}")
        return data["id"]
    
    def test_get_emergency_contacts(self, auth_headers):
        """Test getting emergency contacts list"""
        # First create a contact
        requests.post(f"{BASE_URL}/api/contacts", 
            headers=auth_headers,
            json={
                "name": "TEST_Contact For List",
                "phone": "+9876543210",
                "relationship": "Friend",
                "is_primary": False
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get contacts passed: {len(data)} contacts found")
    
    def test_update_emergency_contact(self, auth_headers):
        """Test updating an emergency contact"""
        # Create contact first
        create_response = requests.post(f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json={
                "name": "TEST_Contact To Update",
                "phone": "+1111111111",
                "relationship": "Colleague",
                "is_primary": False
            }
        )
        contact_id = create_response.json()["id"]
        
        # Update the contact
        update_response = requests.put(f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_headers,
            json={
                "name": "TEST_Updated Contact Name",
                "phone": "+2222222222",
                "relationship": "Best Friend",
                "is_primary": True
            }
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == "TEST_Updated Contact Name"
        assert data["phone"] == "+2222222222"
        print(f"✓ Contact updated successfully")
    
    def test_delete_emergency_contact(self, auth_headers):
        """Test deleting an emergency contact"""
        # Create contact first
        create_response = requests.post(f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json={
                "name": "TEST_Contact To Delete",
                "phone": "+3333333333",
                "relationship": "Neighbor",
                "is_primary": False
            }
        )
        contact_id = create_response.json()["id"]
        
        # Delete the contact
        delete_response = requests.delete(f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion - should not appear in list
        list_response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        contacts = list_response.json()
        contact_ids = [c["id"] for c in contacts]
        assert contact_id not in contact_ids
        print(f"✓ Contact deleted successfully")


class TestSOSAlerts:
    """SOS alert functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for SOS tests"""
        email = f"sos_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "SOS Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_trigger_sos(self, auth_headers):
        """Test triggering an SOS alert"""
        response = requests.post(f"{BASE_URL}/api/sos",
            headers=auth_headers,
            json={
                "latitude": 40.7128,
                "longitude": -74.0060,
                "message": "TEST_SOS Emergency test",
                "trigger_source": "manual"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 40.7128
        assert data["longitude"] == -74.0060
        assert data["trigger_source"] == "manual"
        assert data["status"] == "active"
        assert "id" in data
        print(f"✓ SOS alert triggered: {data['id']}")
        return data["id"]
    
    def test_get_sos_history(self, auth_headers):
        """Test getting SOS alert history"""
        # First trigger an alert
        requests.post(f"{BASE_URL}/api/sos",
            headers=auth_headers,
            json={
                "latitude": 34.0522,
                "longitude": -118.2437,
                "message": "TEST_History test",
                "trigger_source": "shake"
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/sos/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ SOS history retrieved: {len(data)} alerts")
    
    def test_resolve_sos(self, auth_headers):
        """Test resolving an SOS alert"""
        # Create alert first
        create_response = requests.post(f"{BASE_URL}/api/sos",
            headers=auth_headers,
            json={
                "latitude": 51.5074,
                "longitude": -0.1278,
                "message": "TEST_To resolve",
                "trigger_source": "manual"
            }
        )
        alert_id = create_response.json()["id"]
        
        # Resolve the alert
        resolve_response = requests.put(f"{BASE_URL}/api/sos/{alert_id}/resolve",
            headers=auth_headers
        )
        assert resolve_response.status_code == 200
        data = resolve_response.json()
        assert data["message"] == "Alert resolved"
        print(f"✓ SOS alert resolved successfully")


class TestGoingOutMode:
    """Going Out Mode functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Going Out tests"""
        email = f"goingout_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Going Out Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_start_going_out_session(self, auth_headers):
        """Test starting a Going Out session"""
        response = requests.post(f"{BASE_URL}/api/going-out/start",
            headers=auth_headers,
            json={
                "preset": "club",
                "voice_activation_enabled": True,
                "shake_detection_enabled": True,
                "auto_record_enabled": False,
                "checkin_enabled": True,
                "checkin_interval": 30
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preset"] == "club"
        assert data["is_active"] == True
        assert data["voice_activation_enabled"] == True
        assert data["checkin_interval"] == 30
        assert "id" in data
        print(f"✓ Going Out session started: {data['preset']}")
    
    def test_get_active_going_out_session(self, auth_headers):
        """Test getting active Going Out session"""
        # Start a session first
        requests.post(f"{BASE_URL}/api/going-out/start",
            headers=auth_headers,
            json={
                "preset": "date",
                "checkin_enabled": True,
                "checkin_interval": 15
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/going-out/active", headers=auth_headers)
        assert response.status_code == 200
        # Response can be null if no session, or session object
        data = response.json()
        if data:
            assert data["is_active"] == True
            print(f"✓ Active session retrieved: {data['preset']}")
        else:
            print(f"✓ No active session (expected if ended)")
    
    def test_end_going_out_session(self, auth_headers):
        """Test ending a Going Out session"""
        # Start session first
        requests.post(f"{BASE_URL}/api/going-out/start",
            headers=auth_headers,
            json={
                "preset": "walking",
                "checkin_enabled": False
            }
        )
        
        response = requests.post(f"{BASE_URL}/api/going-out/end", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Going Out Mode ended"
        print(f"✓ Going Out session ended successfully")
    
    def test_checkin_response(self, auth_headers):
        """Test responding to a check-in"""
        # Start session first
        requests.post(f"{BASE_URL}/api/going-out/start",
            headers=auth_headers,
            json={
                "preset": "festival",
                "checkin_enabled": True,
                "checkin_interval": 30
            }
        )
        
        response = requests.post(f"{BASE_URL}/api/going-out/checkin",
            headers=auth_headers,
            json={
                "is_safe": True,
                "latitude": 40.7128,
                "longitude": -74.0060
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "next_checkin" in data or "message" in data
        print(f"✓ Check-in response recorded")


class TestJourneySharing:
    """Journey Sharing functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Journey tests"""
        email = f"journey_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Journey Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_start_journey_share(self, auth_headers):
        """Test starting a journey share"""
        response = requests.post(f"{BASE_URL}/api/journey/start",
            headers=auth_headers,
            json={
                "preset": "walking",
                "duration_hours": 2,
                "latitude": 40.7128,
                "longitude": -74.0060
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == True
        assert "share_token" in data
        assert len(data["share_token"]) > 0
        print(f"✓ Journey share started with token: {data['share_token']}")
        return data["share_token"]
    
    def test_get_active_journey(self, auth_headers):
        """Test getting active journey share"""
        # Start journey first
        start_response = requests.post(f"{BASE_URL}/api/journey/start",
            headers=auth_headers,
            json={
                "preset": "date",
                "duration_hours": 4
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/journey/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            assert data["is_active"] == True
            print(f"✓ Active journey retrieved")
        else:
            print(f"✓ No active journey (may have expired)")
    
    def test_public_journey_tracking(self, auth_headers):
        """Test public journey tracking by share token"""
        # Start journey first
        start_response = requests.post(f"{BASE_URL}/api/journey/start",
            headers=auth_headers,
            json={
                "preset": "travel",
                "duration_hours": 8,
                "latitude": 34.0522,
                "longitude": -118.2437
            }
        )
        share_token = start_response.json()["share_token"]
        
        # Track without auth (public endpoint)
        response = requests.get(f"{BASE_URL}/api/journey/track/{share_token}")
        assert response.status_code == 200
        data = response.json()
        assert "user_name" in data
        assert "is_active" in data
        print(f"✓ Public journey tracking works for: {data['user_name']}")
    
    def test_update_journey_location(self, auth_headers):
        """Test updating journey location"""
        # Start journey first
        requests.post(f"{BASE_URL}/api/journey/start",
            headers=auth_headers,
            json={
                "preset": "club",
                "duration_hours": 4
            }
        )
        
        response = requests.post(f"{BASE_URL}/api/journey/update-location",
            headers=auth_headers,
            json={
                "latitude": 41.8781,
                "longitude": -87.6298,
                "battery_level": 75
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Location updated"
        print(f"✓ Journey location updated")
    
    def test_end_journey_share(self, auth_headers):
        """Test ending a journey share"""
        # Start journey first
        requests.post(f"{BASE_URL}/api/journey/start",
            headers=auth_headers,
            json={
                "preset": "walking",
                "duration_hours": 1
            }
        )
        
        response = requests.post(f"{BASE_URL}/api/journey/end", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Journey sharing stopped"
        print(f"✓ Journey share ended")


class TestUserSettings:
    """User Settings functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Settings tests"""
        email = f"settings_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Settings Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_user_settings(self, auth_headers):
        """Test getting user settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check default settings exist
        assert "country_code" in data
        assert "voice_activation_enabled" in data
        assert "activation_phrase" in data
        assert "checkin_interval" in data
        assert "shake_detection_enabled" in data
        print(f"✓ User settings retrieved: country={data['country_code']}")
    
    def test_update_user_settings(self, auth_headers):
        """Test updating user settings"""
        response = requests.put(f"{BASE_URL}/api/settings",
            headers=auth_headers,
            json={
                "country_code": "GB",
                "voice_activation_enabled": True,
                "activation_phrase": "Help me please",
                "checkin_interval": 15,
                "shake_detection_enabled": True,
                "low_battery_threshold": 25
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["country_code"] == "GB"
        assert data["voice_activation_enabled"] == True
        assert data["activation_phrase"] == "Help me please"
        assert data["checkin_interval"] == 15
        print(f"✓ User settings updated successfully")
    
    def test_settings_persistence(self, auth_headers):
        """Test settings are persisted after update"""
        # Update settings
        requests.put(f"{BASE_URL}/api/settings",
            headers=auth_headers,
            json={
                "country_code": "AU",
                "low_battery_threshold": 30
            }
        )
        
        # Get settings to verify persistence
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["country_code"] == "AU"
        assert data["low_battery_threshold"] == 30
        print(f"✓ Settings persistence verified")


class TestFakeCallContacts:
    """Fake Call Contacts functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Fake Call tests"""
        email = f"fakecall_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Fake Call Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_fake_call_contact(self, auth_headers):
        """Test creating a fake call contact"""
        response = requests.post(f"{BASE_URL}/api/fake-call-contacts",
            headers=auth_headers,
            json={
                "name": "TEST_Mom",
                "phone": "+1555123456"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Mom"
        assert data["phone"] == "+1555123456"
        assert "id" in data
        print(f"✓ Fake call contact created: {data['name']}")
        return data["id"]
    
    def test_get_fake_call_contacts(self, auth_headers):
        """Test getting fake call contacts list"""
        # Create a contact first
        requests.post(f"{BASE_URL}/api/fake-call-contacts",
            headers=auth_headers,
            json={
                "name": "TEST_Boss",
                "phone": "+1555987654"
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/fake-call-contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fake call contacts retrieved: {len(data)} contacts")
    
    def test_delete_fake_call_contact(self, auth_headers):
        """Test deleting a fake call contact"""
        # Create contact first
        create_response = requests.post(f"{BASE_URL}/api/fake-call-contacts",
            headers=auth_headers,
            json={
                "name": "TEST_To Delete",
                "phone": "+1555000000"
            }
        )
        contact_id = create_response.json()["id"]
        
        # Delete the contact
        delete_response = requests.delete(f"{BASE_URL}/api/fake-call-contacts/{contact_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["message"] == "Contact deleted"
        print(f"✓ Fake call contact deleted successfully")


class TestLocationTracking:
    """Location tracking functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Location tests"""
        email = f"location_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Location Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_save_location(self, auth_headers):
        """Test saving a location"""
        response = requests.post(f"{BASE_URL}/api/location",
            headers=auth_headers,
            json={
                "latitude": 40.7128,
                "longitude": -74.0060,
                "battery_level": 85,
                "is_emergency": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 40.7128
        assert data["longitude"] == -74.0060
        assert data["battery_level"] == 85
        print(f"✓ Location saved successfully")
    
    def test_get_location_history(self, auth_headers):
        """Test getting location history"""
        # Save some locations first
        for i in range(3):
            requests.post(f"{BASE_URL}/api/location",
                headers=auth_headers,
                json={
                    "latitude": 40.0 + i,
                    "longitude": -74.0 + i,
                    "battery_level": 90 - (i * 10),
                    "is_emergency": False
                }
            )
        
        response = requests.get(f"{BASE_URL}/api/location/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        print(f"✓ Location history retrieved: {len(data)} entries")


class TestBatteryAndShutdown:
    """Battery and Shutdown handling tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for Battery tests"""
        email = f"battery_test_{uuid.uuid4().hex[:8]}@safeguard.ai"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Battery Test User"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_battery_update_normal(self, auth_headers):
        """Test battery update with normal level"""
        response = requests.post(f"{BASE_URL}/api/battery/update",
            headers=auth_headers,
            json={
                "level": 75,
                "is_charging": False,
                "latitude": 40.7128,
                "longitude": -74.0060
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == 75
        assert data["warning"] is None
        print(f"✓ Normal battery update handled")
    
    def test_battery_update_low(self, auth_headers):
        """Test battery update with low level"""
        # First enable low battery warning in settings
        requests.put(f"{BASE_URL}/api/settings",
            headers=auth_headers,
            json={
                "low_battery_warning": True,
                "low_battery_threshold": 20
            }
        )
        
        response = requests.post(f"{BASE_URL}/api/battery/update",
            headers=auth_headers,
            json={
                "level": 15,
                "is_charging": False,
                "latitude": 40.7128,
                "longitude": -74.0060
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["warning"] == "low"
        print(f"✓ Low battery warning triggered")
    
    def test_shutdown_alert(self, auth_headers):
        """Test shutdown alert"""
        response = requests.post(f"{BASE_URL}/api/shutdown/alert", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["shutdown_detected"] == True
        print(f"✓ Shutdown alert handled")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
