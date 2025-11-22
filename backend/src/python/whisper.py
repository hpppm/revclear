import sys
import json
import tempfile
import os
from faster_whisper import WhisperModel

def main():
    try:
        # Read audio data from stdin
        audio_data = sys.stdin.buffer.read()

        if not audio_data:
            raise ValueError("No audio data received from stdin.")

        # Use a temporary file to process the audio stream
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        # Initialize the Whisper model
        # Using a small, CPU-based model for broader compatibility.
        # For production, consider 'base' or 'small' on a GPU-enabled environment.
        model = WhisperModel("tiny", device="cpu", compute_type="int8")

        # Transcribe the audio file
        segments, info = model.transcribe(tmp_path, beam_size=5)

        # Process segments into a list of dictionaries
        segment_list = []
        full_text = []
        for segment in segments:
            segment_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            full_text.append(segment.text.strip())

        # Prepare the final JSON output
        output_json = {
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "text": " ".join(full_text),
            "segments": segment_list
        }

        # Print the JSON output to stdout
        print(json.dumps(output_json, indent=2))

    except Exception as e:
        # Log errors to stderr
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    finally:
        # Clean up the temporary file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    main()
