# Whisper Lambda Function

AWS Lambda function for audio transcription using OpenAI's Whisper model.

## Overview

This Lambda function transcribes audio files stored in S3 using the Whisper speech-to-text model. It supports multiple audio formats and can handle transcription in various languages.

## Architecture

- **Runtime**: Python 3.10+
- **Model**: OpenAI Whisper (configurable size)
- **Input**: S3 audio files
- **Output**: JSON with transcription text and segments

## Setup

### 1. Install Dependencies Locally

```bash
cd backend/lambdas/whisper
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Set these in your Lambda configuration:

- `WHISPER_MODEL_SIZE`: Model size (`tiny`, `base`, `small`, `medium`, `large`) - default: `base`
- `AWS_REGION`: AWS region for S3 access

### 3. Lambda Configuration Requirements

**Memory**: Minimum 3GB (recommended 4-10GB depending on model size)
**Timeout**: Minimum 5 minutes (300 seconds)
**Storage**: Minimum 1GB ephemeral storage

### Model Sizes and Performance

| Model  | Size    | Memory Needed | Speed    | Accuracy |
|--------|---------|---------------|----------|----------|
| tiny   | ~75 MB  | 2-3 GB        | Very Fast| Basic    |
| base   | ~142 MB | 3-4 GB        | Fast     | Good     |
| small  | ~466 MB | 4-6 GB        | Medium   | Better   |
| medium | ~1.5 GB | 8-10 GB       | Slow     | Great    |
| large  | ~3 GB   | 10+ GB        | Very Slow| Best     |

## API Usage

### Request Format

```json
{
  "bucket": "your-audio-bucket",
  "key": "path/to/audio.mp3",
  "language": "en",
  "task": "transcribe"
}
```

### Parameters

- `bucket` (required): S3 bucket name containing the audio file
- `key` (required): S3 object key (path) to the audio file
- `language` (optional): Language code (e.g., "en", "es", "fr")
- `task` (optional): Either "transcribe" (default) or "translate" (to English)

### Response Format

```json
{
  "text": "Full transcription text...",
  "language": "en",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 5.2,
      "text": "First segment text"
    }
  ],
  "source": {
    "bucket": "your-audio-bucket",
    "key": "path/to/audio.mp3"
  }
}
```

## Deployment

### Option 1: Using Docker (Recommended for Lambda)

Create a Dockerfile for Lambda container:

```dockerfile
FROM public.ecr.aws/lambda/python:3.10

# Install ffmpeg (required by Whisper)
RUN yum install -y wget tar xz && \
    wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-static/ffmpeg /usr/local/bin/ && \
    rm -rf ffmpeg-*

# Copy requirements and install
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy function code
COPY lambda_handler.py .

CMD ["lambda_handler.lambda_handler"]
```

### Option 2: Using Lambda Layers

Due to the size of Whisper and its dependencies, consider using Lambda Layers:

1. Create a layer with dependencies
2. Deploy the handler code separately
3. Attach the layer to your Lambda function

### Building a Lambda Layer

```bash
# Create layer structure
mkdir -p layer/python
pip install -r requirements.txt -t layer/python/
cd layer
zip -r whisper-layer.zip python/
```

## Integration with Your Project

### Terraform Configuration

Add to your `terraform/lambda.tf`:

```hcl
resource "aws_lambda_function" "whisper_transcribe" {
  function_name = "revclear-whisper-transcribe"
  filename      = "whisper-deployment.zip"
  handler       = "lambda_handler.lambda_handler"
  runtime       = "python3.10"
  timeout       = 300
  memory_size   = 4096
  
  environment {
    variables = {
      WHISPER_MODEL_SIZE = "base"
    }
  }
  
  ephemeral_storage {
    size = 2048  # MB
  }
}
```

## Testing Locally

```python
import json
from lambda_handler import lambda_handler

event = {
    "bucket": "my-audio-bucket",
    "key": "recordings/call-001.mp3",
    "language": "en"
}

result = lambda_handler(event, None)
print(json.dumps(result, indent=2))
```

## Supported Audio Formats

Whisper supports various audio formats including:
- MP3
- WAV
- M4A
- FLAC
- OGG
- And more...

## Performance Tips

1. **Use appropriate model size**: Start with `tiny` or `base` for testing
2. **Pre-process audio**: Convert to 16kHz mono WAV for best performance
3. **Chunk long files**: Split files longer than 10 minutes
4. **Use SQS**: For async processing of multiple files
5. **Consider ECS/Fargate**: For large models or high volume

## Cost Considerations

- Lambda pricing based on memory and execution time
- Larger models = more memory = higher cost
- Consider using reserved capacity for high volume
- S3 data transfer costs apply

## Troubleshooting

### Out of Memory Errors
- Increase Lambda memory allocation
- Use a smaller model size
- Reduce audio file length

### Timeout Issues
- Increase Lambda timeout (max 15 minutes)
- Use smaller model or shorter audio files
- Consider async processing with Step Functions

### Model Loading Slow
- Cold starts can be 30-60 seconds
- Consider provisioned concurrency
- Use container images with pre-loaded models

## Security

- Ensure Lambda has S3 read permissions
- Use VPC if accessing private resources
- Encrypt audio files in S3
- Use IAM roles with least privilege

## License

OpenAI Whisper is licensed under MIT License.
