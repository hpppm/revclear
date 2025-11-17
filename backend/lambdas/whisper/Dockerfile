# Dockerfile for Whisper Lambda function
# This creates a container image that can be deployed to AWS Lambda

FROM public.ecr.aws/lambda/python:3.10

# Install system dependencies
RUN yum update -y && \
    yum install -y wget tar xz && \
    yum clean all

# Install ffmpeg (required by Whisper for audio processing)
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar xf ffmpeg-release-amd64-static.tar.xz && \
    cp ffmpeg-*-static/ffmpeg /usr/local/bin/ && \
    cp ffmpeg-*-static/ffprobe /usr/local/bin/ && \
    rm -rf ffmpeg-*

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY lambda_handler.py .

# Pre-download Whisper model (optional - increases image size but reduces cold start)
# Uncomment to include a specific model in the image
# RUN python -c "import whisper; whisper.load_model('base')"

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]
