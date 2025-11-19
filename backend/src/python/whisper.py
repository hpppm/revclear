import sys
from faster_whisper import WhisperModel

audio_file = sys.argv[1]

model = WhisperModel("small", device="cpu")

segments, _ = model.transcribe(audio_file)

full_text = " ".join([seg.text for seg in segments])
print(full_text)
