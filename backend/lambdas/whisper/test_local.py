"""
Local test script for Whisper Lambda function.
This allows you to test the function without deploying to AWS.
"""

import json
import sys
from lambda_handler import lambda_handler

def test_transcription():
    """Test the Whisper transcription with a sample event."""
    
    # Sample event - replace with your actual S3 bucket and audio file
    test_event = {
        "bucket": "your-bucket-name",
        "key": "audio/sample.mp3",
        "language": "en",
        "task": "transcribe"
    }
    
    print("🧪 Testing Whisper Lambda Function")
    print("=" * 50)
    print(f"Event: {json.dumps(test_event, indent=2)}")
    print("=" * 50)
    
    try:
        # Call the Lambda handler
        result = lambda_handler(test_event, None)
        
        print("\n✅ Success!")
        print("=" * 50)
        print(f"Status Code: {result['statusCode']}")
        
        # Parse and display the response
        if result['statusCode'] == 200:
            body = json.loads(result['body'])
            print(f"\nTranscription Text:")
            print("-" * 50)
            print(body['text'])
            print("-" * 50)
            
            print(f"\nDetected Language: {body.get('language', 'N/A')}")
            print(f"Number of Segments: {len(body.get('segments', []))}")
            
            # Display first few segments
            segments = body.get('segments', [])
            if segments:
                print("\nFirst 3 Segments:")
                for seg in segments[:3]:
                    print(f"  [{seg['start']:.2f}s - {seg['end']:.2f}s]: {seg['text']}")
        else:
            error_body = json.loads(result['body'])
            print(f"\n❌ Error: {error_body}")
        
    except Exception as e:
        print(f"\n❌ Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def test_with_local_file():
    """Test with a local audio file."""
    
    print("📁 Testing with local file (requires boto3 mock)")
    print("Note: For local file testing, you'll need to modify the lambda_handler")
    print("      to accept local file paths or use moto for S3 mocking.")

if __name__ == "__main__":
    print("Whisper Lambda Local Test")
    print("=" * 50)
    
    # Check if AWS credentials are configured
    import os
    if not os.environ.get('AWS_ACCESS_KEY_ID'):
        print("⚠️  Warning: AWS credentials not found in environment")
        print("   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to test with S3")
        print()
    
    # You can switch between tests
    if len(sys.argv) > 1 and sys.argv[1] == "--local":
        test_with_local_file()
    else:
        test_transcription()
