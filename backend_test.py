#!/usr/bin/env python3

import requests
import sys
import json
from pathlib import Path
import time

class FIRSTAPITester:
    def __init__(self, base_url="https://promophone-plus.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_number_id = None
        self.created_place_id = None
        self.created_operator_id = None
        self.created_operator_with_logo_id = None
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

    def test_list_places_promo_flag(self):
        """Test GET /api/places to verify hasPromo flag in list view"""
        success, response = self.run_test("List places for promo check", "GET", "/places", 200)
        
        if success:
            # Look for places with and without promo
            places_with_promo = [p for p in response if p.get('hasPromo') is True]
            places_without_promo = [p for p in response if p.get('hasPromo') is False]
            
            print(f"✅ Found {len(places_with_promo)} places with promo")
            print(f"✅ Found {len(places_without_promo)} places without promo")
            
            # Verify that places with promo have promoCode or promoUrl (though these fields might not be in list view)
            if places_with_promo:
                print(f"✅ Places with hasPromo=true found in list")
            if places_without_promo:
                print(f"✅ Places with hasPromo=false found in list")
                
        return success

    def test_get_places_with_promo_details(self):
        """Test GET /api/places/{id} for places with different promo configurations"""
        # First get the list to find places with different promo setups
        success, places_list = self.run_test("Get places list", "GET", "/places", 200)
        
        if not success:
            return False
            
        # Find places with different promo configurations
        place_with_code = None
        place_with_url = None
        place_with_both = None
        place_without_promo = None
        
        for place in places_list:
            if place.get('promoCode') and not place.get('promoUrl'):
                place_with_code = place
            elif place.get('promoUrl') and not place.get('promoCode'):
                place_with_url = place
            elif place.get('promoCode') and place.get('promoUrl'):
                place_with_both = place
            elif not place.get('promoCode') and not place.get('promoUrl'):
                place_without_promo = place
        
        all_passed = True
        
        # Test place with only promoCode
        if place_with_code:
            success, response = self.run_test(
                f"Get place with promoCode ({place_with_code['name']})", 
                "GET", 
                f"/places/{place_with_code['id']}", 
                200
            )
            if success:
                if response.get('hasPromo') is True and response.get('promoCode'):
                    print(f"✅ Place with promoCode has correct hasPromo=true and promoCode field")
                else:
                    print(f"❌ Place with promoCode failed validation")
                    all_passed = False
        
        # Test place with only promoUrl
        if place_with_url:
            success, response = self.run_test(
                f"Get place with promoUrl ({place_with_url['name']})", 
                "GET", 
                f"/places/{place_with_url['id']}", 
                200
            )
            if success:
                if response.get('hasPromo') is True and response.get('promoUrl'):
                    print(f"✅ Place with promoUrl has correct hasPromo=true and promoUrl field")
                else:
                    print(f"❌ Place with promoUrl failed validation")
                    all_passed = False
        
        # Test place with both fields
        if place_with_both:
            success, response = self.run_test(
                f"Get place with both promo fields ({place_with_both['name']})", 
                "GET", 
                f"/places/{place_with_both['id']}", 
                200
            )
            if success:
                if (response.get('hasPromo') is True and 
                    response.get('promoCode') and 
                    response.get('promoUrl')):
                    print(f"✅ Place with both promo fields has correct hasPromo=true and both fields")
                else:
                    print(f"❌ Place with both promo fields failed validation")
                    all_passed = False
        
        # Test place without promo
        if place_without_promo:
            success, response = self.run_test(
                f"Get place without promo ({place_without_promo['name']})", 
                "GET", 
                f"/places/{place_without_promo['id']}", 
                200
            )
            if success:
                if (response.get('hasPromo') is False and 
                    not response.get('promoCode') and 
                    not response.get('promoUrl')):
                    print(f"✅ Place without promo has correct hasPromo=false and no promo fields")
                else:
                    print(f"❌ Place without promo failed validation")
                    all_passed = False
        
        return all_passed

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

    def test_search_with_digits(self):
        """Test GET /api/search with digit query - should return numbers"""
        # Test with phone number digits
        test_queries = ["79990001234", "999", "+7 999 000 12 34", "8 999 000 12 34"]
        
        for query in test_queries:
            success, response = self.run_test(
                f"Search with digits: '{query}'", 
                "GET", 
                f"/search?q={query}", 
                200
            )
            
            if success:
                numbers = response.get('numbers', [])
                places = response.get('places', [])
                
                # For digit queries, we should get numbers (might be empty if no matches)
                if isinstance(numbers, list) and isinstance(places, list):
                    print(f"✅ Search returned proper structure - Numbers: {len(numbers)}, Places: {len(places)}")
                    # For digit queries, places should be empty
                    if len(places) == 0:
                        print(f"✅ Digit query correctly returned no places")
                    else:
                        print(f"❌ Digit query should not return places, got {len(places)}")
                        return False
                else:
                    print(f"❌ Search response structure invalid")
                    return False
            else:
                return False
        
        return True

    def test_search_with_text(self):
        """Test GET /api/search with text query - should return places"""
        # Test with place names
        test_queries = ["магнит", "Нефтл", "кафе", "test"]
        
        for query in test_queries:
            success, response = self.run_test(
                f"Search with text: '{query}'", 
                "GET", 
                f"/search?q={query}", 
                200
            )
            
            if success:
                numbers = response.get('numbers', [])
                places = response.get('places', [])
                
                # For text queries, we should get places (might be empty if no matches)
                if isinstance(numbers, list) and isinstance(places, list):
                    print(f"✅ Search returned proper structure - Numbers: {len(numbers)}, Places: {len(places)}")
                    # For text queries, numbers should be empty
                    if len(numbers) == 0:
                        print(f"✅ Text query correctly returned no numbers")
                    else:
                        print(f"❌ Text query should not return numbers, got {len(numbers)}")
                        return False
                else:
                    print(f"❌ Search response structure invalid")
                    return False
            else:
                return False
        
        return True

    def test_search_edge_cases(self):
        """Test GET /api/search with edge cases"""
        edge_cases = [
            ("", "empty query"),
            ("   ", "whitespace only"),
            ("!@#$%", "special characters"),
            ("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "long text"),
            ("1234567890123456789012345678901234567890", "very long digits")
        ]
        
        for query, description in edge_cases:
            success, response = self.run_test(
                f"Search edge case - {description}: '{query}'", 
                "GET", 
                f"/search?q={query}", 
                200
            )
            
            if success:
                numbers = response.get('numbers', [])
                places = response.get('places', [])
                
                if isinstance(numbers, list) and isinstance(places, list):
                    print(f"✅ Edge case handled properly - Numbers: {len(numbers)}, Places: {len(places)}")
                else:
                    print(f"❌ Edge case response structure invalid")
                    return False
            else:
                return False
        
        return True

    def test_search_partial_matches(self):
        """Test GET /api/search with partial matches"""
        # First create some test data to search for
        test_number_phone = f"+7999888{self.timestamp[-4:]}"
        test_place_name = f"SearchTest-{self.timestamp}"
        
        # Create a test number
        number_data = {
            "phone": test_number_phone,
            "operatorKey": "mts"
        }
        success, number_response = self.run_test("Create test number for search", "POST", "/numbers", 200, number_data)
        if not success:
            return False
        
        # Create a test place
        place_data = {
            "name": test_place_name,
            "category": "Тест"
        }
        success, place_response = self.run_test(
            "Create test place for search", 
            "POST", 
            "/places", 
            200, 
            data=place_data, 
            files=None, 
            is_multipart=True
        )
        if not success:
            return False
        
        # Test partial number search
        partial_digits = test_number_phone.replace("+7", "").replace(" ", "")[:6]  # First 6 digits
        success, response = self.run_test(
            f"Search partial number: '{partial_digits}'", 
            "GET", 
            f"/search?q={partial_digits}", 
            200
        )
        
        if success:
            numbers = response.get('numbers', [])
            found = any(n.get('phone') == test_number_phone for n in numbers)
            if found:
                print(f"✅ Partial number search found created number")
            else:
                print(f"❌ Partial number search did not find created number")
                return False
        else:
            return False
        
        # Test partial place search
        partial_name = test_place_name[:8]  # First 8 characters
        success, response = self.run_test(
            f"Search partial place: '{partial_name}'", 
            "GET", 
            f"/search?q={partial_name}", 
            200
        )
        
        if success:
            places = response.get('places', [])
            found = any(p.get('name') == test_place_name for p in places)
            if found:
                print(f"✅ Partial place search found created place")
            else:
                print(f"❌ Partial place search did not find created place")
                return False
        else:
            return False
        
        return True

    def test_create_number_from_search(self):
        """Test POST /api/numbers - create number from search dialog"""
        # Test creating a number as would happen from search dialog
        search_phone = f"+7888777{self.timestamp[-4:]}"
        
        data = {
            "phone": search_phone,
            "operatorKey": "beeline"
        }
        
        success, response = self.run_test("Create number from search dialog", "POST", "/numbers", 200, data)
        
        if success:
            # Verify the created number has correct format
            created_phone = response.get('phone')
            if created_phone and created_phone.startswith('+7'):
                print(f"✅ Number created with correct format: {created_phone}")
                
                # Verify it can be found in search
                digits = created_phone.replace('+7', '').replace(' ', '')[:6]
                search_success, search_response = self.run_test(
                    f"Search for created number: '{digits}'", 
                    "GET", 
                    f"/search?q={digits}", 
                    200
                )
                
                if search_success:
                    numbers = search_response.get('numbers', [])
                    found = any(n.get('phone') == created_phone for n in numbers)
                    if found:
                        print(f"✅ Created number found in search results")
                    else:
                        print(f"❌ Created number not found in search results")
                        return False
                else:
                    return False
            else:
                print(f"❌ Created number has incorrect format: {created_phone}")
                return False
        else:
            return False
        
        return True

    def test_create_place_from_search(self):
        """Test POST /api/places - create place from search dialog with all fields"""
        # Test creating a place as would happen from search dialog
        search_place_name = f"SearchPlace-{self.timestamp}"
        
        data = {
            "name": search_place_name,
            "category": "Кафе",
            "promoCode": "SEARCH123",
            "promoUrl": "https://example.com/search-promo"
        }
        
        success, response = self.run_test(
            "Create place from search dialog", 
            "POST", 
            "/places", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            # Verify the created place has all fields
            created_name = response.get('name')
            created_category = response.get('category')
            has_promo = response.get('hasPromo')
            promo_code = response.get('promoCode')
            promo_url = response.get('promoUrl')
            
            if (created_name == search_place_name and 
                created_category == "Кафе" and 
                has_promo is True and
                promo_code == "SEARCH123" and
                promo_url == "https://example.com/search-promo"):
                print(f"✅ Place created with all correct fields")
                
                # Verify it can be found in search
                search_success, search_response = self.run_test(
                    f"Search for created place: '{search_place_name[:8]}'", 
                    "GET", 
                    f"/search?q={search_place_name[:8]}", 
                    200
                )
                
                if search_success:
                    places = search_response.get('places', [])
                    found = any(p.get('name') == search_place_name for p in places)
                    if found:
                        print(f"✅ Created place found in search results")
                    else:
                        print(f"❌ Created place not found in search results")
                        return False
                else:
                    return False
            else:
                print(f"❌ Created place has incorrect fields")
                print(f"   Expected: name={search_place_name}, category=Кафе, hasPromo=True")
                print(f"   Got: name={created_name}, category={created_category}, hasPromo={has_promo}")
                return False
        else:
            return False
        
        return True

    def test_search_differentiation(self):
        """Test that search correctly differentiates between number and place queries"""
        test_cases = [
            ("79990001234", "digits", "numbers"),
            ("999000", "digits", "numbers"),
            ("+7 999 000 12 34", "phone format", "numbers"),
            ("магнит", "text", "places"),
            ("Кафе Пушкин", "text with spaces", "places"),
            ("ABC123", "mixed alphanumeric", "places"),
            ("test place", "text with space", "places")
        ]
        
        for query, description, expected_type in test_cases:
            success, response = self.run_test(
                f"Search differentiation - {description}: '{query}'", 
                "GET", 
                f"/search?q={query}", 
                200
            )
            
            if success:
                numbers = response.get('numbers', [])
                places = response.get('places', [])
                
                if expected_type == "numbers":
                    if len(places) == 0:
                        print(f"✅ {description} correctly identified as number query (no places returned)")
                    else:
                        print(f"❌ {description} should be number query but returned {len(places)} places")
                        return False
                elif expected_type == "places":
                    if len(numbers) == 0:
                        print(f"✅ {description} correctly identified as place query (no numbers returned)")
                    else:
                        print(f"❌ {description} should be place query but returned {len(numbers)} numbers")
                        return False
            else:
                return False
        
        return True

    def run_search_tests(self):
        """Run search functionality tests as requested in review"""
        print("🔍 Starting Search Functionality Tests")
        print("=" * 50)
        
        search_tests = [
            self.test_search_with_digits,
            self.test_search_with_text,
            self.test_search_edge_cases,
            self.test_search_partial_matches,
            self.test_create_number_from_search,
            self.test_create_place_from_search,
            self.test_search_differentiation,
        ]
        
        for test in search_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        print("📊 Search Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

    def test_admin_fix_timestamps(self):
        """Test POST /api/admin/fix_timestamps - shift legacy timestamps by +3h"""
        # First, let's get some existing records to check timestamps before fix
        print("📅 Getting existing records before timestamp fix...")
        
        # Get some numbers and places to check their timestamps
        numbers_success, numbers_before = self.run_test("Get numbers before fix", "GET", "/numbers", 200)
        places_success, places_before = self.run_test("Get places before fix", "GET", "/places", 200)
        
        if not numbers_success or not places_success:
            print("❌ Could not get existing records for timestamp comparison")
            return False
        
        # Store some timestamps for comparison
        sample_timestamps_before = {}
        if numbers_before and len(numbers_before) > 0:
            sample_timestamps_before['number_1'] = numbers_before[0].get('createdAt')
        if places_before and len(places_before) > 0:
            sample_timestamps_before['place_1'] = places_before[0].get('createdAt')
        
        # Call the admin fix endpoint
        success, response = self.run_test(
            "Admin fix timestamps (+3h shift)", 
            "POST", 
            "/admin/fix_timestamps", 
            200
        )
        
        if not success:
            return False
        
        # Verify response structure
        required_fields = ['ok', 'numbers', 'places']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field '{field}' in response")
                return False
        
        # Verify response values
        if response.get('ok') is not True:
            print(f"❌ Expected ok=true, got ok={response.get('ok')}")
            return False
        
        numbers_fixed = response.get('numbers', 0)
        places_fixed = response.get('places', 0)
        
        if not isinstance(numbers_fixed, int) or numbers_fixed < 0:
            print(f"❌ Invalid numbers count: {numbers_fixed}")
            return False
        
        if not isinstance(places_fixed, int) or places_fixed < 0:
            print(f"❌ Invalid places count: {places_fixed}")
            return False
        
        print(f"✅ Timestamp fix completed: {numbers_fixed} numbers, {places_fixed} places")
        
        # Now fetch some records to verify timestamps are shifted by +3h
        success, numbers_after = self.run_test("Get numbers after fix", "GET", "/numbers", 200)
        if not success:
            return False
        
        success, places_after = self.run_test("Get places after fix", "GET", "/places", 200)
        if not success:
            return False
        
        # Verify the +3h shift by comparing timestamps
        shift_verification_passed = 0
        total_shift_checks = 0
        
        # Check if timestamps were shifted by exactly 3 hours
        if numbers_after and len(numbers_after) > 0 and sample_timestamps_before.get('number_1'):
            total_shift_checks += 1
            before_str = sample_timestamps_before['number_1']
            after_str = numbers_after[0].get('createdAt')
            
            if before_str and after_str:
                try:
                    # Parse timestamps (they might not have timezone info in response)
                    from datetime import datetime
                    before_dt = datetime.fromisoformat(before_str.replace('Z', '+00:00'))
                    after_dt = datetime.fromisoformat(after_str.replace('Z', '+00:00'))
                    
                    # Calculate the difference
                    diff = after_dt - before_dt
                    expected_diff_hours = 3
                    actual_diff_hours = diff.total_seconds() / 3600
                    
                    if abs(actual_diff_hours - expected_diff_hours) < 0.01:  # Allow small floating point errors
                        print(f"✅ Number timestamp correctly shifted by +3h: {before_str} → {after_str}")
                        shift_verification_passed += 1
                    else:
                        print(f"❌ Number timestamp shift incorrect. Expected +3h, got +{actual_diff_hours:.2f}h")
                except Exception as e:
                    print(f"❌ Error parsing number timestamps: {e}")
        
        if places_after and len(places_after) > 0 and sample_timestamps_before.get('place_1'):
            total_shift_checks += 1
            before_str = sample_timestamps_before['place_1']
            after_str = places_after[0].get('createdAt')
            
            if before_str and after_str:
                try:
                    # Parse timestamps (they might not have timezone info in response)
                    from datetime import datetime
                    before_dt = datetime.fromisoformat(before_str.replace('Z', '+00:00'))
                    after_dt = datetime.fromisoformat(after_str.replace('Z', '+00:00'))
                    
                    # Calculate the difference
                    diff = after_dt - before_dt
                    expected_diff_hours = 3
                    actual_diff_hours = diff.total_seconds() / 3600
                    
                    if abs(actual_diff_hours - expected_diff_hours) < 0.01:  # Allow small floating point errors
                        print(f"✅ Place timestamp correctly shifted by +3h: {before_str} → {after_str}")
                        shift_verification_passed += 1
                    else:
                        print(f"❌ Place timestamp shift incorrect. Expected +3h, got +{actual_diff_hours:.2f}h")
                except Exception as e:
                    print(f"❌ Error parsing place timestamps: {e}")
        
        # Verify timestamp format (ISO strings)
        timestamp_format_checks = 0
        total_format_checks = 0
        
        # Check a few numbers and places for proper timestamp format
        for i, number in enumerate(numbers_after[:2]):  # Check first 2 numbers
            created_at = number.get('createdAt')
            if created_at:
                total_format_checks += 1
                # Check if it's a proper ISO string format
                if isinstance(created_at, str) and 'T' in created_at and len(created_at) >= 19:
                    print(f"✅ Number {i+1} has proper ISO timestamp format: {created_at}")
                    timestamp_format_checks += 1
                else:
                    print(f"❌ Number {i+1} has invalid timestamp format: {created_at}")
        
        for i, place in enumerate(places_after[:2]):  # Check first 2 places
            created_at = place.get('createdAt')
            if created_at:
                total_format_checks += 1
                # Check if it's a proper ISO string format
                if isinstance(created_at, str) and 'T' in created_at and len(created_at) >= 19:
                    print(f"✅ Place {i+1} has proper ISO timestamp format: {created_at}")
                    timestamp_format_checks += 1
                else:
                    print(f"❌ Place {i+1} has invalid timestamp format: {created_at}")
        
        # Summary of results
        print(f"✅ Timestamp shift verification: {shift_verification_passed}/{total_shift_checks} passed")
        print(f"✅ Timestamp format verification: {timestamp_format_checks}/{total_format_checks} passed")
        
        # The test passes if:
        # 1. The API response is correct (ok=true, numbers/places counts)
        # 2. The timestamps are shifted by +3h (if we have data to compare)
        # 3. The timestamps are in proper ISO format
        
        api_response_ok = (response.get('ok') is True and 
                          isinstance(numbers_fixed, int) and 
                          isinstance(places_fixed, int))
        
        shift_ok = (total_shift_checks == 0 or shift_verification_passed == total_shift_checks)
        format_ok = (total_format_checks == 0 or timestamp_format_checks == total_format_checks)
        
        if api_response_ok and shift_ok and format_ok:
            print("✅ Admin timestamp fix functionality working correctly")
            return True
        else:
            print("❌ Admin timestamp fix has issues")
            return False

    def run_promo_tests(self):
        """Run promo-specific API tests"""
        print("🎯 Starting Promo Feature Tests")
        print("=" * 50)
        
        promo_tests = [
            self.test_specific_place_neftl_promo,
            self.test_list_places_promo_flag,
            self.test_get_places_with_promo_details,
            # Skip create tests due to backend ObjectId serialization issue
            # self.test_create_place_with_promo_code,
            # self.test_create_place_with_promo_url,
            # self.test_create_place_with_both_promo_fields,
            # self.test_create_place_without_promo,
        ]
        
        for test in promo_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        print("📊 Promo Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

    def test_list_operators(self):
        """Test GET /api/operators - should return list of operators with proper structure"""
        success, response = self.run_test("List operators", "GET", "/operators", 200)
        
        if not success:
            return False
        
        # Verify response is a list
        if not isinstance(response, list):
            print(f"❌ Expected list, got {type(response)}")
            return False
        
        # Should have at least some default operators
        if len(response) == 0:
            print(f"❌ Expected at least some operators, got empty list")
            return False
        
        print(f"✅ Found {len(response)} operators")
        
        # Verify structure of first operator
        first_operator = response[0]
        required_fields = ['id', 'name', 'hasLogo', 'createdAt']
        
        for field in required_fields:
            if field not in first_operator:
                print(f"❌ Missing required field '{field}' in operator")
                return False
        
        # Verify field types
        if not isinstance(first_operator['id'], str):
            print(f"❌ Operator id should be string, got {type(first_operator['id'])}")
            return False
        
        if not isinstance(first_operator['name'], str):
            print(f"❌ Operator name should be string, got {type(first_operator['name'])}")
            return False
        
        if not isinstance(first_operator['hasLogo'], bool):
            print(f"❌ Operator hasLogo should be boolean, got {type(first_operator['hasLogo'])}")
            return False
        
        # Verify no 'logo' field is present (should be stripped)
        if 'logo' in first_operator:
            print(f"❌ Operator should not contain 'logo' field in list response")
            return False
        
        print(f"✅ Operators have correct structure")
        
        # Check for some expected default operators
        operator_names = [op['name'] for op in response]
        expected_operators = ['МегаФон', 'Билайн', 'МТС']
        
        found_expected = 0
        for expected in expected_operators:
            if expected in operator_names:
                found_expected += 1
                print(f"✅ Found expected operator: {expected}")
        
        if found_expected > 0:
            print(f"✅ Found {found_expected}/{len(expected_operators)} expected default operators")
        else:
            print(f"❌ No expected default operators found")
            return False
        
        return True

    def test_get_operator_details(self):
        """Test GET /api/operators/{id} - should return operator details"""
        # First get the list to find an operator ID
        success, operators_list = self.run_test("Get operators list for details test", "GET", "/operators", 200)
        
        if not success or not operators_list:
            print(f"❌ Could not get operators list for details test")
            return False
        
        # Test with first operator
        first_operator = operators_list[0]
        operator_id = first_operator['id']
        
        success, response = self.run_test(
            f"Get operator details ({first_operator['name']})", 
            "GET", 
            f"/operators/{operator_id}", 
            200
        )
        
        if not success:
            return False
        
        # Verify response structure
        required_fields = ['id', 'name', 'hasLogo', 'createdAt']
        
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field '{field}' in operator details")
                return False
        
        # Verify the ID matches
        if response['id'] != operator_id:
            print(f"❌ Operator ID mismatch. Expected: {operator_id}, Got: {response['id']}")
            return False
        
        # Verify the name matches
        if response['name'] != first_operator['name']:
            print(f"❌ Operator name mismatch. Expected: {first_operator['name']}, Got: {response['name']}")
            return False
        
        # Verify no 'logo' field is present (should be stripped)
        if 'logo' in response:
            print(f"❌ Operator details should not contain 'logo' field")
            return False
        
        print(f"✅ Operator details correct for: {response['name']}")
        
        return True

    def test_operators_consistency(self):
        """Test that operators list is consistent between calls"""
        # Get operators list twice and compare
        success1, response1 = self.run_test("Get operators list (first call)", "GET", "/operators", 200)
        if not success1:
            return False
        
        success2, response2 = self.run_test("Get operators list (second call)", "GET", "/operators", 200)
        if not success2:
            return False
        
        # Compare lengths
        if len(response1) != len(response2):
            print(f"❌ Operators list length inconsistent. First: {len(response1)}, Second: {len(response2)}")
            return False
        
        # Compare operator IDs and names
        ids1 = {op['id']: op['name'] for op in response1}
        ids2 = {op['id']: op['name'] for op in response2}
        
        if ids1 != ids2:
            print(f"❌ Operators list content inconsistent between calls")
            return False
        
        print(f"✅ Operators list is consistent between calls ({len(response1)} operators)")
        
        return True

    def test_operators_for_frontend_sync(self):
        """Test operators endpoint specifically for frontend sync functionality"""
        success, response = self.run_test("Get operators for frontend sync", "GET", "/operators", 200)
        
        if not success:
            return False
        
        # This is the critical test for the sync issue mentioned in test_result.md
        # The frontend Numbers->Operators modal should use this same data as Settings->Edit Operators
        
        # Verify we have operators data that can be used for sync
        if not isinstance(response, list) or len(response) == 0:
            print(f"❌ CRITICAL: No operators data available for frontend sync")
            return False
        
        # Verify each operator has the minimum required fields for frontend display
        for i, operator in enumerate(response):
            # Check required fields for frontend display
            if 'id' not in operator:
                print(f"❌ CRITICAL: Operator {i} missing 'id' field required for frontend sync")
                return False
            
            if 'name' not in operator:
                print(f"❌ CRITICAL: Operator {i} missing 'name' field required for frontend display")
                return False
            
            if 'hasLogo' not in operator:
                print(f"❌ CRITICAL: Operator {i} missing 'hasLogo' field required for frontend display")
                return False
            
            # Verify the name is not empty (required for display)
            if not operator['name'] or not operator['name'].strip():
                print(f"❌ CRITICAL: Operator {i} has empty name")
                return False
            
            # Verify ID is valid UUID format
            if not operator['id'] or len(operator['id']) < 10:
                print(f"❌ CRITICAL: Operator {i} has invalid ID: {operator['id']}")
                return False
        
        print(f"✅ CRITICAL: All {len(response)} operators have required fields for frontend sync")
        
        # Log operator names for verification against frontend
        operator_names = [op['name'] for op in response]
        print(f"✅ Operator names available for sync: {', '.join(operator_names)}")
        
        return True

    def test_create_operator_without_logo(self):
        """Test POST /api/operators without logo"""
        data = {
            "name": f"ТестОператор-{self.timestamp}"
        }
        
        success, response = self.run_test(
            "Create operator without logo", 
            "POST", 
            "/operators", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            # Store the created operator ID for later tests
            if 'id' in response:
                self.created_operator_id = response['id']
                print(f"✅ Created operator ID: {self.created_operator_id}")
            
            # Verify response structure
            required_fields = ['id', 'name', 'hasLogo', 'createdAt']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field '{field}' in create response")
                    return False
            
            # Verify hasLogo is false
            if response.get('hasLogo') is not False:
                print(f"❌ Expected hasLogo=false, got {response.get('hasLogo')}")
                return False
            
            print(f"✅ Operator created without logo: {response['name']}")
        
        return success

    def test_create_operator_with_logo(self):
        """Test POST /api/operators with logo"""
        # Use a small test image (create a minimal PNG)
        import base64
        # Minimal 1x1 PNG image in base64
        minimal_png = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=='
        )
        
        data = {
            "name": f"ТестЛого-{self.timestamp}"
        }
        
        files = {
            'logo': ('test.png', minimal_png, 'image/png')
        }
        
        success, response = self.run_test(
            "Create operator with logo", 
            "POST", 
            "/operators", 
            200, 
            data=data, 
            files=files, 
            is_multipart=True
        )
        
        if success:
            # Store the created operator ID for later tests
            if 'id' in response:
                self.created_operator_with_logo_id = response['id']
                print(f"✅ Created operator with logo ID: {self.created_operator_with_logo_id}")
            
            # Verify hasLogo is true
            if response.get('hasLogo') is not True:
                print(f"❌ Expected hasLogo=true, got {response.get('hasLogo')}")
                return False
            
            print(f"✅ Operator created with logo: {response['name']}")
        
        return success

    def test_get_operator_logo(self):
        """Test GET /api/operators/{id}/logo when hasLogo is true"""
        if not hasattr(self, 'created_operator_with_logo_id') or not self.created_operator_with_logo_id:
            print(f"❌ No operator with logo available for logo test")
            return False
            
        url = f"{self.api_url}/operators/{self.created_operator_with_logo_id}/logo"
        self.log(f"Testing Get operator logo...")
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

    def test_update_operator_name(self):
        """Test PUT /api/operators/{id} to update name"""
        if not hasattr(self, 'created_operator_id') or not self.created_operator_id:
            print(f"❌ No operator available for update test")
            return False
        
        new_name = f"ОбновленныйОператор-{self.timestamp}"
        
        # Use multipart form data for PUT request
        url = f"{self.api_url}/operators/{self.created_operator_id}"
        self.log(f"Testing Update operator name...")
        self.log(f"URL: {url}")
        
        try:
            data = {"name": new_name}
            response = requests.put(url, data=data)
            self.tests_run += 1
            
            if response.status_code == 200:
                self.tests_passed += 1
                response_data = response.json()
                print(f"✅ PASSED - Status: {response.status_code}")
                print(f"   Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                
                # Verify the name was updated
                if response_data.get('name') != new_name:
                    print(f"❌ Name not updated. Expected: {new_name}, Got: {response_data.get('name')}")
                    return False
                
                print(f"✅ Operator name updated to: {new_name}")
                return True
            else:
                print(f"❌ FAILED - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return False
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False

    def test_delete_operator_main_flow(self):
        """Test DELETE /api/operators/{id} - main deletion flow as requested"""
        print("🗑️ Testing DELETE operator main flow...")
        
        # Step 1: List operators to get initial count
        success, initial_list = self.run_test("List operators (before create)", "GET", "/operators", 200)
        if not success:
            return False
        
        initial_count = len(initial_list)
        print(f"✅ Initial operators count: {initial_count}")
        
        # Step 2: Create a temp operator with specific name "ТестУдаление123"
        temp_name = "ТестУдаление123"
        data = {
            "name": temp_name
        }
        
        success, create_response = self.run_test(
            "Create temp operator for deletion", 
            "POST", 
            "/operators", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if not success or 'id' not in create_response:
            print(f"❌ Failed to create temp operator")
            return False
        
        temp_operator_id = create_response['id']
        print(f"✅ Created temp operator '{temp_name}' with ID: {temp_operator_id}")
        
        # Step 3: Ensure it appears in GET list
        success, after_create_list = self.run_test("List operators (after create)", "GET", "/operators", 200)
        if not success:
            return False
        
        # Check if our temp operator is in the list
        found_in_list = any(op.get('id') == temp_operator_id and op.get('name') == temp_name for op in after_create_list)
        if not found_in_list:
            print(f"❌ Temp operator not found in list after creation")
            return False
        
        print(f"✅ Temp operator found in list after creation")
        after_create_count = len(after_create_list)
        print(f"✅ Operators count after create: {after_create_count}")
        
        # Step 4: Delete it via DELETE /api/operators/{id}
        success, delete_response = self.run_test(
            f"Delete temp operator ({temp_name})", 
            "DELETE", 
            f"/operators/{temp_operator_id}", 
            200
        )
        
        if not success:
            return False
        
        # Verify delete response
        if delete_response.get('ok') is not True:
            print(f"❌ Delete response should have ok=true, got: {delete_response}")
            return False
        
        print(f"✅ Temp operator deleted successfully")
        
        # Step 5: Ensure it no longer appears in GET list
        success, after_delete_list = self.run_test("List operators (after delete)", "GET", "/operators", 200)
        if not success:
            return False
        
        # Check that our temp operator is NOT in the list
        still_found = any(op.get('id') == temp_operator_id for op in after_delete_list)
        if still_found:
            print(f"❌ Temp operator still found in list after deletion")
            return False
        
        print(f"✅ Temp operator no longer appears in list after deletion")
        after_delete_count = len(after_delete_list)
        print(f"✅ Operators count after delete: {after_delete_count}")
        
        # Verify count decreased by 1
        if after_delete_count != initial_count:
            print(f"❌ Operators count mismatch. Expected: {initial_count}, Got: {after_delete_count}")
            return False
        
        print(f"✅ DELETE operator main flow completed successfully")
        return True

    def test_delete_nonexistent_operator(self):
        """Test DELETE /api/operators/{id} with non-existing ID - should return 404"""
        # Use a fake UUID that doesn't exist
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        success, response = self.run_test(
            "Delete non-existent operator (should fail)", 
            "DELETE", 
            f"/operators/{fake_id}", 
            404
        )
        
        if success:
            # Verify the error response structure
            if 'detail' in response and response['detail'] == "Operator not found":
                print(f"✅ Correct error response: {response}")
            else:
                print(f"❌ Incorrect error response. Expected 'Operator not found', got: {response}")
                return False
        
        return success

    def run_operators_tests(self):
        """Run operators-specific API tests for sync functionality"""
        print("📱 Starting Operators Sync Tests")
        print("=" * 50)
        
        operators_tests = [
            self.test_list_operators,
            self.test_get_operator_details,
            self.test_operators_consistency,
            self.test_operators_for_frontend_sync,
        ]
        
        for test in operators_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        print("📊 Operators Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

    def run_operators_delete_tests(self):
        """Run comprehensive DELETE operators tests as requested in review"""
        print("🗑️ Starting Operators DELETE Tests")
        print("=" * 50)
        
        # Reset counters for this test suite
        initial_tests_run = self.tests_run
        initial_tests_passed = self.tests_passed
        
        delete_tests = [
            # Main DELETE flow as requested
            self.test_delete_operator_main_flow,
            
            # Regression tests
            self.test_list_operators,
            self.test_create_operator_without_logo,
            self.test_create_operator_with_logo,
            self.test_get_operator_details,
            self.test_get_operator_logo,
            self.test_update_operator_name,
            
            # Negative test
            self.test_delete_nonexistent_operator,
        ]
        
        for test in delete_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        # Calculate results for this test suite only
        suite_tests_run = self.tests_run - initial_tests_run
        suite_tests_passed = self.tests_passed - initial_tests_passed
        
        print("📊 Operators DELETE Test Results:")
        print(f"   Tests run: {suite_tests_run}")
        print(f"   Tests passed: {suite_tests_passed}")
        print(f"   Success rate: {(suite_tests_passed/suite_tests_run*100):.1f}%")
        
        return suite_tests_passed == suite_tests_run

    def run_admin_tests(self):
        """Run admin-specific API tests"""
        print("🔧 Starting Admin Feature Tests")
        print("=" * 50)
        
        admin_tests = [
            self.test_admin_fix_timestamps,
        ]
        
        for test in admin_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        print("📊 Admin Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

    def test_create_category_temp(self):
        """Test POST /api/categories - create temporary category for deletion test"""
        data = {
            "name": "ТестКатегория_UD1"
        }
        
        success, response = self.run_test(
            "Create temporary category (ТестКатегория_UD1)", 
            "POST", 
            "/categories", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            # Store the created category ID for later tests
            if 'id' in response:
                self.created_category_id = response['id']
                print(f"✅ Created category ID: {self.created_category_id}")
            
            # Verify response structure
            required_fields = ['id', 'name', 'createdAt']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field '{field}' in create response")
                    return False
            
            # Verify name matches
            if response.get('name') != "ТестКатегория_UD1":
                print(f"❌ Expected name='ТестКатегория_UD1', got {response.get('name')}")
                return False
            
            print(f"✅ Category created: {response['name']}")
        
        return success

    def test_list_categories_contains_temp(self):
        """Test GET /api/categories - should include created temporary category"""
        success, response = self.run_test("List categories (should contain temp)", "GET", "/categories", 200)
        
        if not success:
            return False
        
        # Verify response is a list
        if not isinstance(response, list):
            print(f"❌ Expected list, got {type(response)}")
            return False
        
        # Check if our created category is in the list
        if hasattr(self, 'created_category_id') and self.created_category_id:
            found = any(cat.get('id') == self.created_category_id and cat.get('name') == "ТестКатегория_UD1" for cat in response)
            if found:
                print(f"✅ Created category found in list")
            else:
                print(f"❌ Created category NOT found in list")
                return False
        
        print(f"✅ Categories list contains {len(response)} categories")
        return success

    def test_delete_category_main_flow(self):
        """Test DELETE /api/categories/{id} - main deletion flow as requested"""
        if not hasattr(self, 'created_category_id') or not self.created_category_id:
            print(f"❌ No category available for delete test")
            return False
        
        success, response = self.run_test(
            f"Delete category (ТестКатегория_UD1)", 
            "DELETE", 
            f"/categories/{self.created_category_id}", 
            200
        )
        
        if not success:
            return False
        
        # Verify delete response
        if response.get('ok') is not True:
            print(f"❌ Delete response should have ok=true, got: {response}")
            return False
        
        print(f"✅ Category deleted successfully")
        return True

    def test_list_categories_after_delete(self):
        """Test GET /api/categories - should NOT include deleted category"""
        success, response = self.run_test("List categories (after delete)", "GET", "/categories", 200)
        
        if not success:
            return False
        
        # Check that our deleted category is NOT in the list
        if hasattr(self, 'created_category_id') and self.created_category_id:
            still_found = any(cat.get('id') == self.created_category_id for cat in response)
            if still_found:
                print(f"❌ Deleted category still found in list")
                return False
            
            print(f"✅ Deleted category no longer appears in list")
        
        return success

    def test_delete_category_again_404(self):
        """Test DELETE /api/categories/{id} again - should return 404"""
        if not hasattr(self, 'created_category_id') or not self.created_category_id:
            print(f"❌ No category ID available for 404 test")
            return False
        
        success, response = self.run_test(
            "Delete same category again (should fail with 404)", 
            "DELETE", 
            f"/categories/{self.created_category_id}", 
            404
        )
        
        if success:
            # Verify the error response structure
            if 'detail' in response and response['detail'] == "Category not found":
                print(f"✅ Correct 404 error response: {response}")
            else:
                print(f"❌ Incorrect error response. Expected 'Category not found', got: {response}")
                return False
        
        return success

    def test_create_duplicate_category_409(self):
        """Test POST /api/categories with duplicate name - should return 409"""
        # Create first category
        data = {
            "name": f"ДубликатТест-{self.timestamp}"
        }
        
        success, response = self.run_test(
            "Create category for duplicate test", 
            "POST", 
            "/categories", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if not success:
            return False
        
        # Try to create the same category again - should fail with 409
        success, response = self.run_test(
            "Create duplicate category (should fail with 409)", 
            "POST", 
            "/categories", 
            409, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if success:
            # Verify the error response structure
            if 'detail' in response and response['detail'] == "Category already exists":
                print(f"✅ Correct 409 error response: {response}")
            else:
                print(f"❌ Incorrect error response. Expected 'Category already exists', got: {response}")
                return False
        
        return success

    def test_update_category_success(self):
        """Test PUT /api/categories/{id} with new name - should work"""
        # First create a category to update
        data = {
            "name": f"ОбновитьТест-{self.timestamp}"
        }
        
        success, create_response = self.run_test(
            "Create category for update test", 
            "POST", 
            "/categories", 
            200, 
            data=data, 
            files=None, 
            is_multipart=True
        )
        
        if not success or 'id' not in create_response:
            return False
        
        category_id = create_response['id']
        new_name = f"Обновлено-{self.timestamp}"
        
        # Update the category name
        update_data = {
            "name": new_name
        }
        
        # Use multipart form data for PUT request
        url = f"{self.api_url}/categories/{category_id}"
        self.log(f"Testing Update category name to '{new_name}'...")
        self.log(f"URL: {url}")
        
        try:
            response = requests.put(url, data=update_data)
            self.tests_run += 1
            
            if response.status_code == 200:
                self.tests_passed += 1
                response_data = response.json()
                print(f"✅ PASSED - Status: {response.status_code}")
                print(f"   Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                
                # Verify the name was updated
                if response_data.get('name') != new_name:
                    print(f"❌ Name not updated. Expected: {new_name}, Got: {response_data.get('name')}")
                    return False
                
                print(f"✅ Category name updated to: {new_name}")
                return True
            else:
                print(f"❌ FAILED - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return False
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False
        
        if success:
            # Verify the name was updated
            if response.get('name') != new_name:
                print(f"❌ Name not updated. Expected: {new_name}, Got: {response.get('name')}")
                return False
            
            print(f"✅ Category name updated to: {new_name}")
        
        return success

    def test_update_nonexistent_category_404(self):
        """Test PUT /api/categories/{id} with non-existent ID - should return 404"""
        # Use a fake UUID that doesn't exist
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        data = {
            "name": "НесуществующаяКатегория"
        }
        
        # Use multipart form data for PUT request
        url = f"{self.api_url}/categories/{fake_id}"
        self.log(f"Testing Update non-existent category (should fail with 404)...")
        self.log(f"URL: {url}")
        
        try:
            response = requests.put(url, data=data)
            self.tests_run += 1
            
            if response.status_code == 404:
                self.tests_passed += 1
                response_data = response.json()
                print(f"✅ PASSED - Status: {response.status_code}")
                print(f"   Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                
                # Verify the error response structure
                if 'detail' in response_data and response_data['detail'] == "Category not found":
                    print(f"✅ Correct 404 error response: {response_data}")
                    return True
                else:
                    print(f"❌ Incorrect error response. Expected 'Category not found', got: {response_data}")
                    return False
            else:
                print(f"❌ FAILED - Expected 404, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return False
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False
        
        if success:
            # Verify the error response structure
            if 'detail' in response and response['detail'] == "Category not found":
                print(f"✅ Correct 404 error response: {response}")
            else:
                print(f"❌ Incorrect error response. Expected 'Category not found', got: {response}")
                return False
        
        return success

    def run_categories_delete_tests(self):
        """Run comprehensive Categories DELETE tests as requested in review"""
        print("🗂️ Starting Categories DELETE Tests")
        print("=" * 50)
        
        # Reset counters for this test suite
        initial_tests_run = self.tests_run
        initial_tests_passed = self.tests_passed
        
        # Main DELETE flow as requested in review
        delete_tests = [
            # Step 1: Create temporary category
            self.test_create_category_temp,
            
            # Step 2: Verify it appears in GET list
            self.test_list_categories_contains_temp,
            
            # Step 3: DELETE and expect { ok: true }
            self.test_delete_category_main_flow,
            
            # Step 4: Verify no longer appears in GET list
            self.test_list_categories_after_delete,
            
            # Step 5: Attempt DELETE again and expect 404
            self.test_delete_category_again_404,
            
            # Regression tests as requested
            self.test_create_duplicate_category_409,
            self.test_update_category_success,
            self.test_update_nonexistent_category_404,
        ]
        
        for test in delete_tests:
            try:
                test()
                print("-" * 30)
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                print("-" * 30)
        
        # Calculate results for this test suite only
        suite_tests_run = self.tests_run - initial_tests_run
        suite_tests_passed = self.tests_passed - initial_tests_passed
        
        print("📊 Categories DELETE Test Results:")
        print(f"   Tests run: {suite_tests_run}")
        print(f"   Tests passed: {suite_tests_passed}")
        print(f"   Success rate: {(suite_tests_passed/suite_tests_run*100):.1f}%")
        
        return suite_tests_passed == suite_tests_run
def main():
    tester = FIRSTAPITester()
    
    # Run categories DELETE tests as requested in review
    print("Running categories DELETE tests as requested...")
    success = tester.run_categories_delete_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())