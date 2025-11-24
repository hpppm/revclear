"use client";

import React from 'react';

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SoapNoteViewerProps {
  soapNote: SoapNote | null; // Allow null if no SOAP note is available
}

const SoapNoteViewer: React.FC<SoapNoteViewerProps> = ({ soapNote }) => {
  if (!soapNote) {
    return (
      <div className="p-4 border rounded-lg shadow-md bg-white text-gray-500 text-center">
        No SOAP note available to display.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h2 className="text-xl font-semibold mb-3">SOAP Note</h2>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-blue-700">Subjective:</h3>
        <p className="text-gray-800 p-2 bg-gray-50 rounded">{soapNote.subjective}</p>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-green-700">Objective:</h3>
        <p className="text-gray-800 p-2 bg-gray-50 rounded">{soapNote.objective}</p>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-yellow-700">Assessment:</h3>
        <p className="text-gray-800 p-2 bg-gray-50 rounded">{soapNote.assessment}</p>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-red-700">Plan:</h3>
        <p className="text-gray-800 p-2 bg-gray-50 rounded">{soapNote.plan}</p>
      </div>
    </div>
  );
};

export default SoapNoteViewer;
