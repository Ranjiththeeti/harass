import requests
import sys
import time
from datetime import datetime

class HarassmentDetectionAPITester:
    def __init__(self, base_url="https://harassment-shield.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.harassment_accuracy_tests = 0
        self.harassment_accuracy_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_safe_message(self, content, expected_flagged=False):
        """Test sending a safe message"""
        success, response = self.run_test(
            f"Safe Message: '{content}'",
            "POST",
            "messages",
            200,
            data={"content": content}
        )
        if success:
            is_flagged = response.get('is_flagged', True)
            safety_score = response.get('safety_score', 0)
            print(f"   Flagged: {is_flagged}, Safety Score: {safety_score}")
            
            if is_flagged == expected_flagged:
                if not expected_flagged:
                    print("   ✅ Correctly identified as safe")
                else:
                    print("   ✅ Correctly identified as harassment")
                return True, response
            else:
                if not expected_flagged:
                    print("   ❌ FAILED - Should have been safe but was flagged")
                else:
                    print("   ❌ FAILED - Should have been flagged but wasn't")
                return False, response
        return success, response

    def test_harassment_message(self, content, expected_flagged=True):
        """Test sending a harassment message"""
        success, response = self.run_test(
            f"Harassment Message: '{content}'",
            "POST",
            "messages",
            200,
            data={"content": content}
        )
        if success:
            is_flagged = response.get('is_flagged', False)
            harassment_type = response.get('harassment_type')
            flagged_reason = response.get('flagged_reason')
            safety_score = response.get('safety_score', 0)
            print(f"   Flagged: {is_flagged}, Type: {harassment_type}")
            print(f"   Reason: {flagged_reason}")
            print(f"   Safety Score: {safety_score}")
            
            if is_flagged == expected_flagged:
                if expected_flagged:
                    print("   ✅ Correctly identified as harassment")
                else:
                    print("   ✅ Correctly identified as safe")
                return True, response
            else:
                if expected_flagged:
                    print("   ❌ FAILED - Should have been flagged as harassment but wasn't")
                else:
                    print("   ❌ FAILED - Should have been safe but was flagged")
                return False, response
        return success, response

    def test_get_messages(self):
        """Test retrieving all messages"""
        success, response = self.run_test("Get All Messages", "GET", "messages", 200)
        if success:
            message_count = len(response) if isinstance(response, list) else 0
            print(f"   Retrieved {message_count} messages")
        return success, response

    def test_analytics(self):
        """Test analytics endpoint"""
        success, response = self.run_test("Get Analytics", "GET", "analytics", 200)
        if success:
            total = response.get('total_messages', 0)
            flagged = response.get('flagged_messages', 0)
            safety_pct = response.get('safety_percentage', 0)
            breakdown = response.get('harassment_breakdown', {})
            recent = response.get('recent_flagged_messages', [])
            
            print(f"   Total Messages: {total}")
            print(f"   Flagged Messages: {flagged}")
            print(f"   Safety Percentage: {safety_pct}%")
            print(f"   Harassment Breakdown: {breakdown}")
            print(f"   Recent Flagged Count: {len(recent)}")
        return success, response

    def test_clear_messages(self):
        """Test clearing all messages"""
        return self.run_test("Clear All Messages", "DELETE", "messages", 200)

def main():
    print("🚀 Starting AI Harassment Detection API Tests")
    print("=" * 60)
    
    # Setup
    tester = HarassmentDetectionAPITester()
    
    # Test 1: Root endpoint
    print("\n📍 PHASE 1: Basic API Connectivity")
    tester.test_root_endpoint()
    
    # Test 2: Clear existing messages for clean testing
    print("\n📍 PHASE 2: Clean Slate Setup")
    tester.test_clear_messages()
    
    # Test 3: Safe messages - ensure no over-flagging
    print("\n📍 PHASE 3: Safe Message Testing (No Over-flagging)")
    safe_messages = [
        ("Hello there, how are you doing?", False, "Friendly greeting"),
        ("Have a great day!", False, "Positive message"),
        ("Thank you for your help", False, "Gratitude expression"),
        ("The weather is nice today", False, "Neutral comment")
    ]
    
    safe_accuracy_count = 0
    for msg, expected, description in safe_messages:
        print(f"\n✅ {description}")
        tester.harassment_accuracy_tests += 1
        success, response = tester.test_safe_message(msg, expected)
        if success:
            safe_accuracy_count += 1
            tester.harassment_accuracy_passed += 1
        time.sleep(1)  # Small delay for AI processing
    
    print(f"\n📊 Safe Message Accuracy: {safe_accuracy_count}/{len(safe_messages)} ({(safe_accuracy_count/len(safe_messages)*100):.1f}%)")
    
    # Test 4: Harassment messages - CRITICAL TEST CASES from review request
    print("\n📍 PHASE 4: Critical Harassment Detection Testing")
    print("Testing previously failing cases that should now be fixed...")
    
    critical_harassment_messages = [
        ("you're so annoying", True, "Should detect 'annoying' as bullying"),
        ("you're really stupid", True, "Should detect 'stupid' as bullying"), 
        ("shut up idiot", True, "Should detect 'idiot' as bullying"),
        ("go away loser", True, "Should detect 'loser' as bullying")
    ]
    
    harassment_accuracy_count = 0
    for msg, expected, description in critical_harassment_messages:
        print(f"\n🎯 {description}")
        tester.harassment_accuracy_tests += 1
        success, response = tester.test_harassment_message(msg, expected)
        if success:
            harassment_accuracy_count += 1
            tester.harassment_accuracy_passed += 1
        time.sleep(2)  # Longer delay for AI processing
    
    print(f"\n📊 Critical Harassment Detection Accuracy: {harassment_accuracy_count}/{len(critical_harassment_messages)} ({(harassment_accuracy_count/len(critical_harassment_messages)*100):.1f}%)")
    
    # Additional harassment tests
    print("\n📍 PHASE 4b: Additional Harassment Detection Testing")
    additional_harassment = [
        ("I hate you so much", True),
        ("you're worthless", True),
        ("shut up and go away", True)
    ]
    
    for msg, expected in additional_harassment:
        tester.harassment_accuracy_tests += 1
        success, response = tester.test_harassment_message(msg, expected)
        if success:
            tester.harassment_accuracy_passed += 1
        time.sleep(2)
    
    # Test 5: Get all messages
    print("\n📍 PHASE 5: Message Retrieval Testing")
    tester.test_get_messages()
    
    # Test 6: Analytics
    print("\n📍 PHASE 6: Analytics Testing")
    tester.test_analytics()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.harassment_accuracy_tests > 0:
        accuracy_percentage = (tester.harassment_accuracy_passed / tester.harassment_accuracy_tests) * 100
        print(f"🎯 HARASSMENT DETECTION ACCURACY: {tester.harassment_accuracy_passed}/{tester.harassment_accuracy_tests} ({accuracy_percentage:.1f}%)")
        
        if accuracy_percentage >= 90:
            print("🎉 EXCELLENT - Harassment detection improvements are working!")
        elif accuracy_percentage >= 70:
            print("⚠️  GOOD - Some improvements made but more work needed")
        else:
            print("❌ POOR - Critical issues remain with harassment detection")
    
    if tester.tests_passed == tester.tests_run and accuracy_percentage >= 90:
        print("🎉 All tests passed! Backend API is working correctly with excellent harassment detection.")
        return 0
    else:
        print("❌ Some tests failed or harassment detection accuracy is below 90%. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())