"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onRecorded: (file: File) => void;
};

export default function AudioRecorder({ onRecorded }: Props) {
  const [status, setStatus] = useState<"idle" | "recording" | "paused">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emitOnStopRef = useRef(true);

  useEffect(() => {
    return () => {
      stopRecorder(true);
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSeconds(0);
  };

  const stopRecorder = (silent = false) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    recorder.stream.getTracks().forEach((track) => track.stop());

    stopTimer();
    if (!silent) {
      setStatus("idle");
    }
  };

  const startRecording = async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      emitOnStopRef.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (!emitOnStopRef.current || !chunksRef.current.length) {
          chunksRef.current = [];
          emitOnStopRef.current = true;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        chunksRef.current = [];
        onRecorded(file);
      };

      recorder.start();
      setStatus("recording");
      stopTimer();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      setError("Microphone permission denied or unavailable.");
    }
  };

  const togglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      setStatus("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      setStatus("recording");
    }
  };

  const stopAndSave = () => {
    emitOnStopRef.current = true;
    stopRecorder();
  };

  const discard = () => {
    emitOnStopRef.current = false;
    stopRecorder();
  };

  const formattedTime = new Date(seconds * 1000)
    .toISOString()
    .substring(14, 19);

  return (
    <div className="border p-4 rounded-xl bg-white shadow space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">Audio Recorder</p>
          <p className="text-xs text-slate-600">
            Request mic permission, record, pause, stop, or re-record.
          </p>
        </div>
        <span
          className={`h-3 w-3 rounded-full ${
            status === "recording" ? "bg-red-500 animate-pulse" : "bg-slate-300"
          }`}
        />
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-700">
        <span className="font-mono text-lg">{formattedTime}</span>
        <span className="px-2 py-1 rounded-full border text-xs">
          {status === "idle" ? "Idle" : status === "paused" ? "Paused" : "Recording"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={startRecording}
          disabled={status === "recording"}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Start
        </button>
        <button
          onClick={togglePause}
          disabled={status === "idle"}
          className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          onClick={stopAndSave}
          disabled={status === "idle"}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Stop & Save
        </button>
        <button
          onClick={discard}
          disabled={status === "idle"}
          className="px-3 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold disabled:cursor-not-allowed"
        >
          Discard
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
