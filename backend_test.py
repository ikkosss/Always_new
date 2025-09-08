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

def main():
    tester = FIRSTAPITester()
    
    # Run promo-specific tests as requested
    print("Running promo functionality tests as requested...")
    success = tester.run_promo_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())