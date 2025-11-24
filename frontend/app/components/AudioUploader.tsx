"use client";

import React, { useState, useRef } from 'react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  allowedFileTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'],
  maxFileSizeMB = 25,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!allowedFileTypes.includes(file.type)) {
      setError(`Invalid file type. Please upload one of: ${allowedFileTypes.join(', ')}`);
      return false;
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSizeMB}MB limit.`);
      return false;
    }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setError(null);
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setError(null);
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h2 className="text-xl font-semibold mb-3">Upload Audio File</h2>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept={allowedFileTypes.join(',')}
        />
        <p className="text-gray-500">
          {isDragOver ? 'Drop the file here' : 'Drag & drop an audio file here, or click to select one.'}
        </p>
      </div>

      {error && (
        <p className="mt-3 text-red-500 text-sm">{error}</p>
      )}

      {selectedFile && !error && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h3 className="text-lg font-medium">Selected File:</h3>
          <div className="flex justify-between items-center">
            <div>
              <p><strong>Name:</strong> {selectedFile.name}</p>
              <p><strong>Type:</strong> {selectedFile.type}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={clearSelection}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
