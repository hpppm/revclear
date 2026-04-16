"""
RevClear Whisper Transcription Server
Wraps faster-whisper in a Flask HTTP API so the backend can call it.

Usage:
    pip install flask faster-whisper
    python whisper_server.py          # defaults to port 5000
    PORT=5001 python whisper_server.py

Expected request:
    POST /transcribe
    Content-Type: multipart/form-data
    Field: audio  (audio file)

Response:
    { "transcript": "..." }
"""

import os
import sys
import tempfile
import logging
import hmac
from pathlib import Path

from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PORT = int(os.environ.get("PORT", 8000))
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
API_KEY = os.environ.get("AI_SERVER_API_KEY", "")

ALLOWED_EXTENSIONS = {
    ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a",
    ".wav", ".webm", ".ogg", ".flac",
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger("whisper_server")

# ---------------------------------------------------------------------------
# Load model once at startup
# ---------------------------------------------------------------------------
log.info("Loading Whisper model '%s' on '%s' (%s)…", MODEL_SIZE, DEVICE, COMPUTE_TYPE)
try:
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    log.info("Whisper model ready.")
except Exception as exc:
    log.error("Failed to load Whisper model: %s", exc)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)


def _extension_ok(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def _require_api_key():
    if not API_KEY:
        return None

    provided_key = request.headers.get("X-API-Key", "")
    if not provided_key or not hmac.compare_digest(provided_key, API_KEY):
        return jsonify({"error": "Unauthorized"}), 401

    return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    auth_response = _require_api_key()
    if auth_response:
        return auth_response

    # ---- Validate incoming file ----
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided (field name: 'audio')"}), 400

    audio_file = request.files["audio"]

    if not audio_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    if not _extension_ok(audio_file.filename):
        return jsonify({"error": f"Unsupported audio format: {audio_file.filename}"}), 415

    # ---- Save to a temp file and transcribe ----
    suffix = Path(audio_file.filename).suffix or ".audio"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            audio_file.save(tmp)
            tmp_path = tmp.name

        log.info("Transcribing %s (saved as %s) …", audio_file.filename, tmp_path)

        segments, info = model.transcribe(tmp_path, beam_size=5)
        full_text = "".join(seg.text for seg in segments)

        log.info(
            "Done  lang=%s  prob=%.2f  chars=%d",
            info.language,
            info.language_probability,
            len(full_text),
        )

        return jsonify({"transcript": full_text})

    except Exception as exc:
        log.exception("Transcription error: %s", exc)
        return jsonify({"error": "Transcription failed", "detail": str(exc)}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    log.info("RevClear Whisper server starting on port %d", PORT)
    app.run(host="0.0.0.0", port=PORT, debug=False)
