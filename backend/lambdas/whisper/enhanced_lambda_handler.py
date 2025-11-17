"""
Enhanced AWS Lambda handler for audio transcription using OpenAI Whisper.
Includes PII redaction and Bedrock integration based on AWS best practices.

Based on: https://github.com/aws-samples/sample-bedrock-whisper-pii-audio-summarizer
"""

import json
import os
import tempfile
import boto3
from typing import Dict, Any, Optional
import whisper

# Initialize AWS clients
s3_client = boto3.client('s3')
bedrock_runtime = boto3.client('bedrock-runtime')

# Configuration
MODEL_SIZE = os.environ.get('WHISPER_MODEL_SIZE', 'base')
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID', '')  # Optional: Bedrock Guardrail for PII redaction
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')

# Global model instance
model = None


def load_model():
    """Lazy load the Whisper model to optimize cold start."""
    global model
    if model is None:
        print(f"Loading Whisper model: {MODEL_SIZE}")
        model = whisper.load_model(MODEL_SIZE)
    return model


def redact_pii_with_bedrock(text: str, guardrail_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Redact PII from text using Bedrock Guardrails.
    
    Args:
        text: Text to redact PII from
        guardrail_id: Optional Guardrail ID/ARN for PII detection
        
    Returns:
        Dict with redacted text and metadata
    """
    if not guardrail_id or not text:
        return {
            'redacted_text': text,
            'pii_detected': False,
            'redactions': []
        }
    
    try:
        # Use Bedrock Guardrails for PII detection and redaction
        response = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=guardrail_id,
            source='INPUT',
            content=[{
                'text': {
                    'text': text
                }
            }]
        )
        
        # Extract redacted text and metadata
        outputs = response.get('outputs', [])
        redacted_text = outputs[0]['text'] if outputs else text
        
        assessments = response.get('assessments', [])
        pii_entities = []
        
        for assessment in assessments:
            if 'sensitiveInformationPolicy' in assessment:
                pii_entities.extend(
                    assessment['sensitiveInformationPolicy'].get('piiEntities', [])
                )
        
        return {
            'redacted_text': redacted_text,
            'pii_detected': len(pii_entities) > 0,
            'redactions': pii_entities,
            'action': response.get('action', 'NONE')
        }
        
    except Exception as e:
        print(f"Error applying guardrail: {str(e)}")
        return {
            'redacted_text': text,
            'pii_detected': False,
            'error': str(e)
        }


def generate_summary_with_bedrock(text: str) -> str:
    """
    Generate a summary of the transcription using Bedrock.
    
    Args:
        text: Text to summarize
        
    Returns:
        Summary text
    """
    try:
        prompt = f"""Please provide a concise summary of the following transcription. 
Focus on key points, main topics, and important details:

{text}

Summary:"""
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        summary = response_body['content'][0]['text']
        
        return summary
        
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return f"Summary generation failed: {str(e)}"


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Enhanced Lambda handler for audio transcription with PII redaction.
    
    Expected event structure:
    {
        "bucket": "audio-bucket-name",
        "key": "path/to/audio.mp3",
        "language": "en" (optional),
        "task": "transcribe" or "translate" (optional),
        "enable_pii_redaction": true (optional),
        "generate_summary": true (optional)
    }
    """
    try:
        # Parse input
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Handle S3 event trigger format
        if 'Records' in event and len(event['Records']) > 0:
            s3_record = event['Records'][0]['s3']
            bucket = s3_record['bucket']['name']
            key = s3_record['object']['key']
        else:
            bucket = body.get('bucket')
            key = body.get('key')
        
        language = body.get('language')
        task = body.get('task', 'transcribe')
        enable_pii_redaction = body.get('enable_pii_redaction', bool(GUARDRAIL_ID))
        generate_summary = body.get('generate_summary', False)
        
        if not bucket or not key:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: bucket and key'
                })
            }
        
        print(f"Processing audio file: s3://{bucket}/{key}")
        print(f"Options: language={language}, task={task}, PII redaction={enable_pii_redaction}")
        
        # Download audio file from S3
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(key)[1]) as tmp_file:
            tmp_path = tmp_file.name
            s3_client.download_file(bucket, key, tmp_path)
        
        try:
            # Load model and transcribe
            whisper_model = load_model()
            
            transcribe_options = {
                'task': task,
                'fp16': False,
                'verbose': False
            }
            if language:
                transcribe_options['language'] = language
            
            print("Starting transcription...")
            result = whisper_model.transcribe(tmp_path, **transcribe_options)
            
            transcription_text = result['text']
            print(f"Transcription completed. Text length: {len(transcription_text)} characters")
            
            # Apply PII redaction if enabled
            redaction_result = None
            final_text = transcription_text
            
            if enable_pii_redaction and GUARDRAIL_ID:
                print("Applying PII redaction...")
                redaction_result = redact_pii_with_bedrock(transcription_text, GUARDRAIL_ID)
                final_text = redaction_result['redacted_text']
                print(f"PII redaction complete. Detected PII: {redaction_result.get('pii_detected', False)}")
            
            # Generate summary if requested
            summary = None
            if generate_summary:
                print("Generating summary...")
                summary = generate_summary_with_bedrock(final_text)
                print(f"Summary generated. Length: {len(summary)} characters")
            
            # Prepare response
            response_body = {
                'original_text': transcription_text,
                'text': final_text,
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
                },
                'processing': {
                    'pii_redaction_enabled': enable_pii_redaction,
                    'pii_detected': redaction_result.get('pii_detected') if redaction_result else False,
                    'summary_generated': generate_summary
                }
            }
            
            # Add PII redaction details if available
            if redaction_result:
                response_body['pii_redaction'] = {
                    'redactions_count': len(redaction_result.get('redactions', [])),
                    'action': redaction_result.get('action', 'NONE')
                }
            
            # Add summary if generated
            if summary:
                response_body['summary'] = summary
            
            # Optionally save results back to S3
            output_key = f"{os.path.splitext(key)[0]}_transcript.json"
            s3_client.put_object(
                Bucket=bucket,
                Key=output_key,
                Body=json.dumps(response_body, indent=2),
                ContentType='application/json'
            )
            response_body['output_location'] = f"s3://{bucket}/{output_key}"
            
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
        import traceback
        traceback.print_exc()
        
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
        "key": "path/to/audio.mp3",
        "enable_pii_redaction": True,
        "generate_summary": True
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(json.loads(result['body']), indent=2))
