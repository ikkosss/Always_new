#!/usr/bin/env python3

import requests
import sys
import json
from pathlib import Path
import time

class FIRSTAPITester:
    def __init__(self, base_url="https://phonetrack-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_number_id = None
        self.created_place_id = None
        # Use timestamp to make unique entries
        self.timestamp = str(int(time.time()))

    def log(self, message):
        print(f"🔍 {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, is_multipart=False):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        headers = {}
        
        if not is_multipart:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        self.log(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if is_multipart:
                    response = requests.post(url, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test GET /api/ - should return ready message"""
        return self.run_test("Root endpoint", "GET", "/", 200)

    def test_create_number(self):
        """Test POST /api/numbers - create a number"""
        data = {
            "phone": f"+7999000{self.timestamp[-4:]}",  # Use timestamp for unique phone
            "operatorKey": "mts"
        }
        success, response = self.run_test("Create number", "POST", "/numbers", 200, data)
        if success and 'id' in response:
            self.created_number_id = response['id']
            self.log(f"Created number with ID: {self.created_number_id}")
        return success

    def test_list_numbers(self):
        """Test GET /api/numbers - should include created number"""
        success, response = self.run_test("List numbers", "GET", "/numbers", 200)
        if success and self.created_number_id:
            # Check if our created number is in the list
            found = any(n.get('id') == self.created_number_id for n in response)
            if found:
                print(f"✅ Created number found in list")
            else:
                print(f"❌ Created number NOT found in list")
                return False
        return success

    def test_create_place_with_logo(self):
        """Test POST /api/places with multipart form data including logo"""
        # Use the MTS logo from the operators directory
        logo_path = Path("/app/frontend/public/operators/mts.png")
        
        if not logo_path.exists():
            print(f"❌ Logo file not found at {logo_path}")
            return False

        data = {
            "name": f"Магнит-{self.timestamp}",  # Use timestamp for unique name
            "category": "Магазины"
        }
        
        with open(logo_path, 'rb') as logo_file:
            files = {
                'logo': ('mts.png', logo_file, 'image/png')
            }
            success, response = self.run_test(
                "Create place with logo", 
                "POST", 
                "/places", 
                200, 
                data=data, 
                files=files, 
                is_multipart=True
            )
        
        if success and 'id' in response:
            self.created_place_id = response['id']
            self.log(f"Created place with ID: {self.created_place_id}")
            # Check if hasLogo is true
            if response.get('hasLogo'):
                print(f"✅ Place created with logo successfully")
            else:
                print(f"❌ Place created but hasLogo is false")
                return False
        return success

    def test_list_places(self):
        """Test GET /api/places - should include created place"""
        success, response = self.run_test("List places", "GET", "/places", 200)
        if success and self.created_place_id:
            # Check if our created place is in the list
            found = any(p.get('id') == self.created_place_id for p in response)
            if found:
                print(f"✅ Created place found in list")
            else:
                print(f"❌ Created place NOT found in list")
                return False
        return success

    def test_get_place_logo(self):
        """Test GET /api/places/{id}/logo - should return image"""
        if not self.created_place_id:
            print(f"❌ No place ID available for logo test")
            return False
            
        url = f"{self.api_url}/places/{self.created_place_id}/logo"
        self.log(f"Testing Get place logo...")
        self.log(f"URL: {url}")
        
        try:
            response = requests.get(url)
            self.tests_run += 1
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    self.tests_passed += 1
                    print(f"✅ PASSED - Logo retrieved, Content-Type: {content_type}")
                    return True
                else:
                    print(f"❌ FAILED - Wrong content type: {content_type}")
                    return False
            else:
                print(f"❌ FAILED - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False

    def test_create_usage(self):
        """Test POST /api/usage - link number and place"""
        if not self.created_number_id or not self.created_place_id:
            print(f"❌ Missing number ID or place ID for usage test")
            return False
            
        data = {
            "numberId": self.created_number_id,
            "placeId": self.created_place_id,
            "used": True
        }
        return self.run_test("Create usage", "POST", "/usage", 200, data)

    def test_number_usage(self):
        """Test GET /api/numbers/{id}/usage - should show place in used"""
        if not self.created_number_id:
            print(f"❌ No number ID available for usage test")
            return False
            
        success, response = self.run_test(
            "Get number usage", 
            "GET", 
            f"/numbers/{self.created_number_id}/usage", 
            200
        )
        
        if success:
            used_places = response.get('used', [])
            found = any(p.get('id') == self.created_place_id for p in used_places)
            if found:
                print(f"✅ Place found in number's used list")
            else:
                print(f"❌ Place NOT found in number's used list")
                return False
        return success

    def test_place_usage(self):
        """Test GET /api/places/{id}/usage - should show number in used"""
        if not self.created_place_id:
            print(f"❌ No place ID available for usage test")
            return False
            
        success, response = self.run_test(
            "Get place usage", 
            "GET", 
            f"/places/{self.created_place_id}/usage", 
            200
        )
        
        if success:
            used_numbers = response.get('used', [])
            found = any(n.get('id') == self.created_number_id for n in used_numbers)
            if found:
                print(f"✅ Number found in place's used list")
            else:
                print(f"❌ Number NOT found in place's used list")
                return False
        return success

    def test_specific_place_neftl_promo(self):
        """Test GET /api/places/{id} for НЕФТЛ place - should have hasPromo=true"""
        neftl_id = "c4c95482-5229-40bc-a5d1-9b555035235a"
        
        success, response = self.run_test(
            "Get НЕФТЛ place details", 
            "GET", 
            f"/places/{neftl_id}", 
            200
        )
        
        if success:
            has_promo = response.get('hasPromo')
            promo_code = response.get('promoCode')
            
            if has_promo is True:
                print(f"✅ НЕФТЛ place has hasPromo=true")
                if promo_code == "1111111":
                    print(f"✅ НЕФТЛ place has correct promoCode: {promo_code}")
                else:
                    print(f"❌ НЕФТЛ place promoCode mismatch. Expected: 1111111, Got: {promo_code}")
                    return False
            else:
                print(f"❌ НЕФТЛ place hasPromo is not true. Got: {has_promo}")
                return False
        return success

    def test_create_place_with_promo_code(self):
        """Test POST /api/places with promoCode - should have hasPromo=true"""
        data = {
            "name": f"PromoTest-Code-{self.timestamp}",
            "category": "Тест",
            "promoCode": "TEST123"
        }
        
        success, response = self.run_test(
            "Create place with promo code", 
            "POST", 
            "/places", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            has_promo = response.get('hasPromo')
            promo_code = response.get('promoCode')
            
            if has_promo is True:
                print(f"✅ Place with promoCode has hasPromo=true")
                if promo_code == "TEST123":
                    print(f"✅ Place has correct promoCode: {promo_code}")
                else:
                    print(f"❌ Place promoCode mismatch. Expected: TEST123, Got: {promo_code}")
                    return False
            else:
                print(f"❌ Place with promoCode hasPromo is not true. Got: {has_promo}")
                return False
        return success

    def test_create_place_with_promo_url(self):
        """Test POST /api/places with promoUrl - should have hasPromo=true"""
        data = {
            "name": f"PromoTest-URL-{self.timestamp}",
            "category": "Тест",
            "promoUrl": "https://example.com/promo"
        }
        
        success, response = self.run_test(
            "Create place with promo URL", 
            "POST", 
            "/places", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            has_promo = response.get('hasPromo')
            promo_url = response.get('promoUrl')
            
            if has_promo is True:
                print(f"✅ Place with promoUrl has hasPromo=true")
                if promo_url == "https://example.com/promo":
                    print(f"✅ Place has correct promoUrl: {promo_url}")
                else:
                    print(f"❌ Place promoUrl mismatch. Expected: https://example.com/promo, Got: {promo_url}")
                    return False
            else:
                print(f"❌ Place with promoUrl hasPromo is not true. Got: {has_promo}")
                return False
        return success

    def test_create_place_with_both_promo_fields(self):
        """Test POST /api/places with both promoCode and promoUrl - should have hasPromo=true"""
        data = {
            "name": f"PromoTest-Both-{self.timestamp}",
            "category": "Тест",
            "promoCode": "BOTH456",
            "promoUrl": "https://example.com/both"
        }
        
        success, response = self.run_test(
            "Create place with both promo fields", 
            "POST", 
            "/places", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            has_promo = response.get('hasPromo')
            promo_code = response.get('promoCode')
            promo_url = response.get('promoUrl')
            
            if has_promo is True:
                print(f"✅ Place with both promo fields has hasPromo=true")
                if promo_code == "BOTH456" and promo_url == "https://example.com/both":
                    print(f"✅ Place has correct promo fields - Code: {promo_code}, URL: {promo_url}")
                else:
                    print(f"❌ Place promo fields mismatch. Expected Code: BOTH456, URL: https://example.com/both")
                    print(f"   Got Code: {promo_code}, URL: {promo_url}")
                    return False
            else:
                print(f"❌ Place with both promo fields hasPromo is not true. Got: {has_promo}")
                return False
        return success

    def test_create_place_without_promo(self):
        """Test POST /api/places without promo fields - should have hasPromo=false"""
        data = {
            "name": f"NoPromoTest-{self.timestamp}",
            "category": "Тест"
        }
        
        success, response = self.run_test(
            "Create place without promo", 
            "POST", 
            "/places", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            has_promo = response.get('hasPromo')
            promo_code = response.get('promoCode')
            promo_url = response.get('promoUrl')
            
            if has_promo is False:
                print(f"✅ Place without promo has hasPromo=false")
                if promo_code is None and promo_url is None:
                    print(f"✅ Place has no promo fields as expected")
                else:
                    print(f"❌ Place should have no promo fields. Got Code: {promo_code}, URL: {promo_url}")
                    return False
            else:
                print(f"❌ Place without promo hasPromo is not false. Got: {has_promo}")
                return False
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting FIRST API Tests")
        print("=" * 50)
        
        tests = [
            self.test_root_endpoint,
            self.test_create_number,
            self.test_list_numbers,
            self.test_create_place_with_logo,
            self.test_list_places,
            self.test_get_place_logo,
            self.test_create_usage,
            self.test_number_usage,
            self.test_place_usage,
        ]
        
        for test in tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        print("📊 Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FIRSTAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())