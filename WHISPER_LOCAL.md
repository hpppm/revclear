# Whisper: Local vs Cloud

## Current: EC2 + Lambda (~$15-20/month)
- EC2 instance running Whisper
- Lambda calls EC2 endpoint
- Costs money even when idle

## Recommended: Local Development
```bash
pip install openai-whisper
```

**Use local Whisper for**:
- Development and testing
- Small workloads
- Free processing

**Deploy Lambda/EC2 only for**:
- Production scale
- Multi-user access
- Automated pipelines

## Quick Start Local
```python
import whisper
model = whisper.load_model("base")
result = model.transcribe("audio.mp3")
print(result["text"])
```

Save $15-20/month during development.
