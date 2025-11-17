# RevClear - Setup and Test Guide

## Your Current Setup (Already Configured)

✅ **AWS Account**: 414669980881  
✅ **Region**: us-east-1  
✅ **Lambda**: kr  
✅ **S3**: arevclear (main bucket)  
✅ **API Gateway**: https://426dw5oum5.execute-api.us-east-1.amazonaws.com/default  
✅ **DynamoDB**: 3 patient tables  

## Clean Your Repository (Optional)

Run this in your **WSL terminal**:

```bash
cd /mnt/c/Dev/revclear
bash cleanup.sh
```

## Test Your Infrastructure (5 Minutes)

### Step 1: Upload Test Audio

```bash
# In WSL terminal
aws s3 cp /mnt/c/Dev/test_audio.wav s3://arevclear/test/audio/test.wav

# Verify
aws s3 ls s3://arevclear/test/audio/
```

### Step 2: Test Lambda Function

```bash
# Create event payload
cat > s3-event.json << 'EOF'
{
  "Records": [{
    "s3": {
      "bucket": {"name": "arevclear"},
      "object": {"key": "test/audio/test.wav"}
    }
  }]
}
EOF

# Invoke Lambda
aws lambda invoke --function-name kr --payload file://s3-event.json output.json

# View result
cat output.json
```

### Step 3: Check Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/processAudioLambda --since 10m

# Or follow in real-time
aws logs tail /aws/lambda/processAudioLambda --follow
```

### Step 4: Check DynamoDB

```bash
# Check patient data
aws dynamodb scan --table-name mental_health_patients --max-items 3
```

### Step 5: Test API Gateway

```bash
# Test your API
curl -X POST https://426dw5oum5.execute-api.us-east-1.amazonaws.com/default \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## That's It!

Your infrastructure is working. No Lambda deployment needed unless you want to add Whisper later.

## Optional: Deploy Whisper Lambda (When You Need It)

See `backend/lambdas/whisper/README.md` for full instructions.

Quick deploy:
```bash
cd /mnt/c/Dev/revclear/backend/lambdas/whisper
rm -rf build && mkdir build
pip install -r requirements.txt -t build/
cp lambda_handler.py build/
cd build && zip -r ../whisper-lambda.zip . && cd ..

aws lambda create-function \
  --function-name whisper-transcribe \
  --runtime python3.10 \
  --role arn:aws:iam::414669980881:role/revclear-lambda-role \
  --handler lambda_handler.lambda_handler \
  --zip-file fileb://whisper-lambda.zip \
  --timeout 300 \
  --memory-size 4096 \
  --environment 'Variables={WHISPER_MODEL_SIZE=base,S3_BUCKET_MAIN=arevclear}'
```

## Files You Need

| File | Purpose |
|------|---------|
| `TEST_GUIDE.md` | Detailed testing instructions |
| `FINAL_SUMMARY.md` | Complete project summary |
| `cleanup.sh` | Clean build artifacts |
| This file | Quick setup guide |

## Terminal Guide

✅ **Use WSL bash** for all commands  
❌ **Don't use** Windsurf terminal (Windows PowerShell)

Open WSL: Press `Win+R`, type `wsl`, press Enter

---

**Ready to test?** Follow Step 1 above in your WSL terminal.
