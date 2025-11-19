"use client";

import { useState, useRef, useEffect } from "react";
import { transcribe } from "../lib/api/transcribe";
import { useLogger } from "@/contexts/LogContext";
import Button from "./ui/Button"; // New import
import Card from "./ui/Card"; // New import

export default function TranscribePanel() {
  const { log } = useLogger();

  const [selectedFile, setSelectedFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

  const [transcript, setTranscript] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    "Upload or record audio to begin."
  );

  const [isLoading, setIsLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // --------------------------
  // File Upload
  // --------------------------
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAudioURL(URL.createObjectURL(file));
      setStatusMessage(`Selected file: ${file.name}`);
    }
  };

  // --------------------------
  // Start Recording
  // --------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        setSelectedFile(file);
        setAudioURL(URL.createObjectURL(blob));
        setStatusMessage("Recording complete. Ready to transcribe.");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatusMessage("Recording…");

      // Timer
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatusMessage("Microphone access denied.");
    }
  };

  // --------------------------
  // Stop Recording
  // --------------------------
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(recordTimerRef.current);
  };

  // --------------------------
  // Transcribe
  // --------------------------
  const handleTranscribe = async () => {
    if (!selectedFile) {
      setStatusMessage("Please upload or record audio first.");
      return;
    }

    setIsLoading(true);
    setTranscript(null);
    setStatusMessage("Processing transcription…");

    try {
      const result = await transcribe.start(selectedFile);
      setTranscript(result.transcript);
      setStatusMessage("Transcription complete!");
      log("Transcription Succeeded", "success", result);
    } catch (error) {
      const errorMessage = `Error: ${error.message}`;
      setStatusMessage(errorMessage);
      log("Transcription Failed", "error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      header={<h3>Transcription Service (Whisper)</h3>}
      className="service-panel">
      <p className="text-gray-500 text-sm mb-4">
        Upload or record audio and Whisper will transcribe it.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT SIDE */}
        <div className="s3-card p-6">
          <div className="s3-card-header mb-4">
            <span>🎤 Audio Input</span>
          </div>

          <div className="space-y-4"> {/* New container for vertical spacing */}
            {/* Upload */}
            <label className="s3-field block"> {/* mb-4 removed here, let space-y handle it */}
              <span className="">Audio File</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isRecording || isLoading}
              />
            </label>

            {/* Selected File */}
            {selectedFile && (
              <div className="bg-blue-50 border border-blue-300 rounded px-3 py-2 text-blue-700 text-sm"> {/* mb-4 removed here */}
                <strong>Selected:</strong> {selectedFile.name}
              </div>
            )}

            {/* Recording Buttons */}
            <div className="flex items-center gap-4"> {/* mb-8 removed here */}
              {!isRecording ? (
                <Button onClick={startRecording} disabled={isLoading} noTransition>
                  🎙 Start Recording
                </Button>
              ) : (
                <Button variant="danger" onClick={stopRecording}>
                  ⏹ Stop Recording
                </Button>
              )}

              {isRecording && (
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                  Recording… {recordTime}s
                </div>
              )}
            </div>

            {/* Audio Preview */}
            {audioURL && (
              <audio controls src={audioURL} className="w-full"></audio>
            )}

            {/* Transcribe Button */}
            <Button
              onClick={handleTranscribe}
              variant="primary"
              className="w-full" /* mt-4 removed here */
              disabled={isLoading || !selectedFile}>
              {isLoading ? "Transcribing…" : "Transcribe Audio"}
            </Button>
          </div> {/* End space-y-4 container */}

          <div className="s3-action-status mt-3 text-sm text-gray-600">
            {statusMessage}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="s3-card p-6">
          <div className="s3-card-header mb-4">
            <span>📄 Transcript</span>
          </div>

          <div className="transcript-output bg-gray-50 p-4 rounded min-h-[120px]">
            {transcript ? (
              <p className="whitespace-pre-line leading-relaxed">
                {transcript.text}
              </p>
            ) : (
              <p className="text-gray-500">
                Your transcript will appear here after processing.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
