"use client";

import { useCallback, useState } from "react";

type Props = {
  onFileSelect: (file: File) => void;
  accept?: string[];
  maxSizeMB?: number;
};

const defaultTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
];

export default function AudioUploader({
  onFileSelect,
  accept = defaultTypes,
  maxSizeMB = 25,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const validateFile = (file: File) => {
    if (!file) return "No file selected.";
    const tooLarge = file.size / 1024 / 1024 > maxSizeMB;
    if (tooLarge) {
      return `File is too large. Max size is ${maxSizeMB}MB.`;
    }
    const isAllowed = accept.includes(file.type) || file.type.startsWith("audio/");
    if (!isAllowed) {
      return "Unsupported audio type. Please use mp3, wav, m4a, or webm.";
    }
    return null;
  };

  const handleFile = useCallback(
    (file?: File) => {
      if (!file) return;
      const validationError = validateFile(file);
      if (validationError) {
        setMessage(validationError);
        return;
      }
      setMessage(null);
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      className={`border-2 ${dragActive ? "border-blue-500 bg-blue-50" : "border-dashed border-slate-300 bg-white"
        } rounded-xl p-4 shadow transition`}
    >
      <p className="font-medium text-slate-900">Upload Audio</p>
      <p className="text-sm text-slate-600 mb-3">
        Drag & drop or browse (mp3, wav, m4a, webm). Max {maxSizeMB}MB.
      </p>

      <label className="block cursor-pointer">
        <input
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={onInputChange}
        />
        <div className="flex items-center justify-center px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-blue-700 hover:bg-slate-100 font-semibold text-sm">
          Choose a file
        </div>
      </label>

      {fileName && (
        <p className="text-sm text-emerald-700 mt-3">Selected: {fileName}</p>
      )}
      {message && <p className="text-sm text-red-600 mt-2">{message}</p>}
    </div>
  );
}
