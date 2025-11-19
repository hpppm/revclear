import sys
import json
from faster_whisper import WhisperModel

def transcribe_audio(audio_file_path):
    """
    Transcribes an audio file using Faster Whisper.
    """
    model_size = "base"
    device = "cpu" # or "cuda" if you have a compatible GPU (e.g., NVIDIA GPU)
    compute_type = "int8" # for CPU, "float16" for GPU for better performance

    # Load model. It will download on first run if not available locally.
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    segments, info = model.transcribe(audio_file_path, beam_size=5)

    segments_data = []
    for segment in segments:
        segments_data.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })
    
    return {
        "text": "".join([seg["text"] for seg in segments_data]), # Join all segment texts for overall text
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "segments": segments_data
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        error_response = {"error": "No audio file path provided.", "message": "Usage: python whisper.py <audio_file_path>"}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

    audio_file_path = sys.argv[1]

    try:
        transcript = transcribe_audio(audio_file_path)
        print(json.dumps(transcript))
    except Exception as e:
        error_response = {"error": str(e), "message": "Transcription failed. Check Python environment and audio file."}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)