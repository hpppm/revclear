"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request microphone access when the component mounts
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks((prev) => [...prev, event.data]);
          }
        };
        recorder.onstop = () => {
          const mimeType = recorder.mimeType.split(';')[0]; // Extract primary MIME type
          const blob = new Blob(recordedChunks, { type: mimeType });
          setAudioBlob(blob);
          onRecordingComplete(blob); // Emit the complete recording
          setRecordedChunks([]); // Clear chunks for next recording
          stopTimer();
        };
        setMediaRecorder(recorder);
      })
      .catch((err) => {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please ensure it is connected and permissions are granted.');
      });

    return () => {
      // Cleanup: Stop any active recording and media stream if component unmounts
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prevTime) => prevTime + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setRecordedChunks([]); // Clear previous chunks
      setAudioBlob(null); // Clear previous blob
      setRecordingTime(0); // Reset timer
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const discardRecording = () => {
    stopRecording(); // Ensure recording is stopped
    setAudioBlob(null);
    setRecordedChunks([]);
    setRecordingTime(0);
    alert('Recording discarded.');
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h2 className="text-xl font-semibold mb-3">Audio Recorder</h2>
      {!mediaRecorder && <p className="text-red-500">Microphone not available or permission denied.</p>}

      {mediaRecorder && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-lg font-mono">{formatTime(recordingTime)}</div>
          {!isRecording && !audioBlob && (
            <button
              onClick={startRecording}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full"
            >
              Start Recording
            </button>
          )}

          {isRecording && !isPaused && (
            <>
              <button
                onClick={pauseRecording}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Pause
              </button>
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Stop
              </button>
            </>
          )}

          {isRecording && isPaused && (
            <>
              <button
                onClick={resumeRecording}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Resume
              </button>
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Stop
              </button>
            </>
          )}

          {audioBlob && (
            <button
              onClick={discardRecording}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full"
            >
              Discard & Re-record
            </button>
          )}
        </div>
      )}

      {audioBlob && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Recorded Audio:</h3>
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-full"></audio>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
