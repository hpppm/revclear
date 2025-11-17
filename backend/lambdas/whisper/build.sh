#!/bin/bash
# Build script for Whisper Lambda deployment package

set -e

echo "🔨 Building Whisper Lambda package..."

# Clean previous builds
rm -rf build deploy *.zip

# Create build directory
mkdir -p build

echo "📥 Installing dependencies..."
# Install dependencies for Linux Lambda environment
pip install -r requirements.txt \
    --platform manylinux2014_x86_64 \
    --target=build/ \
    --only-binary=:all: \
    --upgrade

echo "📝 Copying Lambda handler..."
cp lambda_handler.py build/

echo "🗜️  Creating deployment package..."
cd build
zip -r ../whisper-lambda.zip . -q
cd ..

echo "✅ Build complete! Package: whisper-lambda.zip"
echo "📦 Package size:"
du -h whisper-lambda.zip

echo ""
echo "Next steps:"
echo "1. Move whisper-lambda.zip to terraform lambda_code_path"
echo "2. Run 'terraform apply' to deploy"
echo ""
