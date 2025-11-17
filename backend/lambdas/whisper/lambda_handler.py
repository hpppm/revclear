"""
AWS Lambda handler for audio transcription using OpenAI Whisper.
Processes audio files from S3 and returns transcription results.
"""

import json
import os
import tempfile
import boto3
from typing import Dict, Any
import whisper

# Initialize S3 client
s3_client = boto3.client('s3')

# Load Whisper model (use 'base' for Lambda, or 'tiny' for faster inference)
# For production, consider using a Lambda layer with the model pre-loaded
MODEL_SIZE = os.environ.get('WHISPER_MODEL_SIZE', 'base')
model = None


def load_model():
    """Lazy load the Whisper model to optimize cold start."""
    global model
    if model is None:
        print(f"Loading Whisper model: {MODEL_SIZE}")
        model = whisper.load_model(MODEL_SIZE)
    return model


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for audio transcription.
    
    Expected event structure:
    {
        "bucket": "audio-bucket-name",
        "key": "path/to/audio.mp3",
        "language": "en" (optional),
        "task": "transcribe" or "translate" (optional)
    }
    """
    try:
        # Parse input
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        bucket = body.get('bucket')
        key = body.get('key')
        language = body.get('language')  # optional: specify language code
        task = body.get('task', 'transcribe')  # 'transcribe' or 'translate'
        
        if not bucket or not key:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: bucket and key'
                })
            }
        
        print(f"Processing audio file: s3://{bucket}/{key}")
        
        # Download audio file from S3 to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(key)[1]) as tmp_file:
            tmp_path = tmp_file.name
            s3_client.download_file(bucket, key, tmp_path)
        
        try:
            # Load model and transcribe
            whisper_model = load_model()
            
            # Transcribe options
            transcribe_options = {
                'task': task,
                'fp16': False  # Set to False for CPU
            }
            if language:
                transcribe_options['language'] = language
            
            print(f"Starting transcription with options: {transcribe_options}")
            result = whisper_model.transcribe(tmp_path, **transcribe_options)
            
            # Prepare response
            response_body = {
                'text': result['text'],
                'language': result.get('language'),
                'segments': [
                    {
                        'id': seg['id'],
                        'start': seg['start'],
                        'end': seg['end'],
                        'text': seg['text']
                    }
                    for seg in result.get('segments', [])
                ],
                'source': {
                    'bucket': bucket,
                    'key': key
                }
            }
            
            print(f"Transcription completed. Text length: {len(result['text'])} characters")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response_body)
            }
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'type': type(e).__name__
            })
        }


# For local testing
if __name__ == "__main__":
    # Test event
    test_event = {
        "bucket": "your-bucket-name",
        "key": "path/to/audio.mp3"
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
