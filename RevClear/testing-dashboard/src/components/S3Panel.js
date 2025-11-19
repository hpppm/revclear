"use client";

import { useState } from "react";
import { s3 } from "../lib/api/s3";
import { useLogger } from "@/contexts/LogContext";
import { createSampleEncounter } from "@/lib/utils/sampleData";
import Button from "./ui/Button";
import Card from "./ui/Card"; // New import

export default function S3Panel() {
  const { log } = useLogger();
  const [key, setKey] = useState("test-reports/encounter-a.json");
  const [contentType, setContentType] = useState("application/json");
  const [body, setBody] = useState('{\n  "test": "file"\n}');
  const [prefix, setPrefix] = useState("test-reports/");
  const [listResults, setListResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState(
    "Ready to run S3 helpers."
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleS3Action = async (actionType, itemKey = null) => {
    setIsLoading(true);
    const summary = `S3 ${actionType}`;
    setStatusMessage(`Running ${actionType}...`);
    try {
      let result;
      if (actionType === "upload") {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          throw new Error("Invalid JSON in file contents.");
        }
        result = await s3.upload(key, parsedBody, contentType);
        setStatusMessage("Upload successful!");
      } else if (actionType === "list") {
        result = await s3.list(prefix);
        setListResults(result.result?.Contents || []);
        setStatusMessage(
          `Found ${result.result?.Contents?.length || 0} files.`
        );
      } else if (actionType === "delete") {
        if (!itemKey) throw new Error("No key provided for deletion.");
        result = await s3.deleteObject(itemKey);
        setListResults((currentResults) =>
          currentResults.filter((item) => item.Key !== itemKey)
        );
        setStatusMessage(`Deleted ${itemKey} successfully!`);
      }
      log(`${summary} successful`, "success", result);
    } catch (error) {
      log(`${summary} failed`, "error", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSample = () => {
    const encounter = createSampleEncounter();
    const sampleKey = `test-reports/${encounter.patientId}-${encounter.encounterDate}.json`;
    setKey(sampleKey);
    setContentType("application/json");
    setBody(JSON.stringify(encounter, null, 2));
    log("Sample encounter populated into editor.", "info");
  };

  const handleDeleteClick = (itemKey) => {
    if (
      window.confirm(`Are you sure you want to delete the file: ${itemKey}?`)
    ) {
      handleS3Action("delete", itemKey);
    }
  };

  return (
    <Card header={<h3>S3 testing console</h3>} className="service-panel">
      <div className="s3-panel-grid">
        <div className="s3-card">
          <div className="s3-card-header">
            <span>📁 Configuration</span>
          </div>
          <div className="s3-field-grid">
            <label className="s3-field">
              <span>File path in bucket</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                type="text"
                className="s3-input"
                disabled={isLoading}
              />
            </label>
            <label className="s3-field">
              <span>Content type</span>
              <input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                type="text"
                className="s3-input"
                disabled={isLoading}
              />
            </label>
            <label className="s3-field">
              <span>List files in path</span>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                type="text"
                className="s3-input"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        <div className="s3-divider"></div>

        <div className="s3-card">
          <div className="s3-card-header">
            <span>🧾 File contents</span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            spellCheck={false}
            className="s3-editor"
            disabled={isLoading}></textarea>
          <Button
            onClick={handleGenerateSample}
            variant="primary"
            type="button"
            disabled={isLoading}>
            ✨ Generate sample JSON
          </Button>
        </div>

        <div className="s3-divider"></div>

        <div className="s3-card">
          <div className="s3-card-header">
            <span>☁️ Actions & feedback</span>
          </div>
          <div className="s3-action-grid">
            <Button
              onClick={() => handleS3Action("upload")}
              variant="primary"
              disabled={isLoading}>
              {isLoading ? "Uploading..." : "Upload to S3"}
            </Button>
            <Button
              onClick={() => handleS3Action("list")}
              variant="secondary"
              disabled={isLoading}>
              {isLoading ? "Listing..." : "List files"}
            </Button>
          </div>
          <div className="s3-action-status">{statusMessage}</div>
          <div className="s3-list-results">
            <span>Latest list results</span>
            <ul>
              {listResults.length > 0 ? (
                listResults.map((item) => (
                  <li key={item.Key} className="s3-list-item">
                    <span>
                      {item.Key} (
                      {item.Size
                        ? `${Math.round(item.Size / 1024)} KB`
                        : "0 KB"}
                      )
                    </span>
                    <Button
                      onClick={() => handleDeleteClick(item.Key)}
                      className="s3-trash-btn"
                      disabled={isLoading}
                      title={`Delete ${item.Key}`}>
                      🗑️
                    </Button>
                  </li>
                ))
              ) : (
                <li>No files listed.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
