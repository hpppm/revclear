"use client";

import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { mockGenkitEncounter } from "@/data/mockGenkitTranscript";
import { genkit } from "@/lib/api/genkit";
import { useLogger } from "@/contexts/LogContext";

export default function GenkitPanel() {
  const { log } = useLogger();
  const [soapResult, setSoapResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    "Review the mock transcript below, then generate a SOAP note."
  );

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatus("Calling speechToSoap flow…");
    setSoapResult(null);

    try {
      const result = await genkit.runSpeechToSoap({
        encounter_id: mockGenkitEncounter.encounter_id,
        transcript: mockGenkitEncounter.transcript,
      });
      setSoapResult(result);
      setStatus("SOAP generated successfully.");
      log("Genkit speechToSoap succeeded", "success", result);
    } catch (error) {
      console.error(error);
      setStatus(
        "Genkit endpoint not ready yet. Backend route will be wired next."
      );
      log("Genkit speechToSoap failed", "error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      header={<h3>Genkit: Speech → SOAP (mock input)</h3>}
      className="service-panel space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <section className="s3-card p-6 space-y-4">
          <div className="s3-card-header">
            <span>🩺 Mock Whisper Transcript</span>
          </div>
          <div className="text-sm text-gray-700 break-words bg-gray-50 p-4 rounded min-h-[180px]">
            <div className="text-xs uppercase text-gray-500 mb-2">
              Encounter ID: {mockGenkitEncounter.encounter_id}
            </div>
            <p>{mockGenkitEncounter.transcript}</p>
          </div>
          <div className="text-xs text-gray-500">
            This mimics the Whisper response we pass into Genkit. Actual flow
            execution uses the Genkit backend (Google Gemini 2.5 Flash).
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleGenerate}
            disabled={isLoading}>
            {isLoading ? "Generating SOAP…" : "Generate SOAP"}
          </Button>
          <div className="text-sm text-gray-600">{status}</div>
        </section>

        <section className="s3-card p-6 space-y-3">
          <div className="s3-card-header">
            <span>🧾 SOAP Output</span>
          </div>
          {soapResult ? (
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-[320px]">
              {JSON.stringify(soapResult, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-gray-500">
              Run the flow to see the Genkit response here.
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
