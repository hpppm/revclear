"use client";

import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import ThinkingIndicator from "./ui/ThinkingIndicator";
import { useLogger } from "@/contexts/LogContext";
import { mockGenkitEncounter } from "@/data/mockGenkitTranscript";
import { genkit } from "@/lib/api/genkit";

export default function GenkitPanel() {
  const { log } = useLogger();
  const [soapResult, setSoapResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    "Review the mock transcript below, then generate a SOAP note."
  );

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatus("Generating SOAP note...");
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

  const handleCopyEncounterId = async () => {
    try {
      await navigator.clipboard.writeText(mockGenkitEncounter.encounter_id);
      setStatus("Encounter ID copied! Use it in the Codes panel to test AI matching.");
    } catch (error) {
      console.error("Failed to copy:", error);
      setStatus("Failed to copy encounter ID");
    }
  };

  return (
    <Card
      header={<h3>Genkit: Speech → SOAP (mock input)</h3>}
      className="service-panel space-y-6">
      {/* Encounter ID Section */}
      <section className="s3-card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-blue-900 mb-1">
              Mock Encounter ID
            </div>
            <code className="text-sm bg-white px-2 py-1 rounded border border-blue-200">
              {mockGenkitEncounter.encounter_id}
            </code>
          </div>
          <Button variant="secondary" onClick={handleCopyEncounterId}>
            Copy ID
          </Button>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          💡 After generating SOAP, use this ID in the <strong>Codes panel</strong> to test AI code matching
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="s3-card p-6 space-y-4">
          <div className="s3-card-header">
            <span>🩺 Mock Whisper Transcript</span>
          </div>
          <div className="text-sm text-gray-700 break-words bg-gray-50 p-4 rounded min-h-[180px]">
            <p>{mockGenkitEncounter.transcript}</p>
          </div>
          <div className="text-xs text-gray-500">
            This mimics the Whisper response we pass into Genkit. The transcript includes anxiety and headache symptoms that will match our mock ICD/CPT codes.
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleGenerate}
            disabled={isLoading}>
            {isLoading ? "Generating SOAP…" : "Generate SOAP"}
          </Button>

          {isLoading ? (
            <ThinkingIndicator message="AI is analyzing transcript and generating SOAP..." />
          ) : (
            <div className="text-sm text-gray-600">{status}</div>
          )}
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
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ) : (
                "Run the flow to see the Genkit response here."
              )}
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
