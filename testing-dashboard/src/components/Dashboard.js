"use client";

import { useState, useEffect } from "react";
import { dev } from "../lib/api/dev";
import S3Panel from "./S3Panel";
import CognitoPanel from "./CognitoPanel";
import DynamoDBPanel from "./DynamoDBPanel";
import TranscribePanel from "./TranscribePanel";
import GenkitPanel from "./GenkitPanel";
import LogPanel from "./LogPanel";
import Card from "./ui/Card";
import RdsPanel from "./RdsPanel";
import CodesPanel from "./CodesPanel";

export default function Dashboard({ user, onLogout }) {
  const [config, setConfig] = useState(null);
  const [activePanel, setActivePanel] = useState(null); // e.g., 's3', 'cognito'

  useEffect(() => {
    // Fetch initial config when the dashboard loads
    async function bootstrap() {
      try {
        const payload = await dev.getConfig();
        setConfig(payload.config || {});
      } catch (error) {
        console.error("Failed to load dashboard config:", error);
      }
    }
    bootstrap();
  }, []);

  const renderActivePanel = () => {
    switch (activePanel) {
      case "s3":
        return <S3Panel />;
      case "cognito":
        return (
          <CognitoPanel
            userPoolId={config?.userPoolId}
            clientId={config?.clientId}
          />
        );
      case "dynamodb":
        return <DynamoDBPanel tableName={config?.testTableName} />;
      case "transcribe":
        return <TranscribePanel />;
      case "genkit":
        return <GenkitPanel />;
      case "rds":
        return <RdsPanel />;
      case "codes":
        return <CodesPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="user-bar">
        <span>{user?.email || "Authenticated User"}</span>
        <button onClick={onLogout} className="secondary" type="button">
          Logout
        </button>
      </div>

      <Card
        className="hero-card"
        header={
          <>
            <p className="hero-label">Internal QA Workspace</p>
            <h1 className="hero-title">RevClear Testing Console</h1>
          </>
        }>
        <p className="hero-subtitle">
          Select a service below to interact with the testing environment.
        </p>
      </Card>

      {/* Service Card Grid */}
      <section className="service-card-grid">
        <article className="service-card">
          <header>
            <span>Cognito</span>
          </header>
          <p>Confirm pool/client IDs and test user authentication flows.</p>
          <button
            onClick={() => setActivePanel("cognito")}
            className="primary"
            type="button">
            Open Cognito Console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>S3 Bucket</span>
          </header>
          <p>Upload, list, and download sample files in the sandbox bucket.</p>
          <button
            onClick={() => setActivePanel("s3")}
            className="primary"
            type="button">
            Open S3 Console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>DynamoDB</span>
          </header>
          <p>Inspect the configured test table and perform basic operations.</p>
          <button
            onClick={() => setActivePanel("dynamodb")}
            className="primary"
            type="button">
            Open DynamoDB Console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>RDS (Postgres)</span>
          </header>
          <p>Draft CRUD requests against the patients table on RDS.</p>
          <button
            onClick={() => setActivePanel("rds")}
            className="primary"
            type="button">
            Open RDS Console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>Transcription</span>
          </header>
          <p>Transcribe an audio file using a local Whisper model.</p>
          <button
            onClick={() => setActivePanel("transcribe")}
            className="primary"
            type="button">
            Open Transcribe Console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>Genkit</span>
          </header>
          <p>
            Review mock Whisper text and generate a SOAP note via the Genkit flow.
          </p>
          <button
            onClick={() => setActivePanel("genkit")}
            className="primary"
            type="button">
            Open Genkit Panel
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>Medical Codes</span>
          </header>
          <p>Test AI code matching, manual search, and claims generation.</p>
          <button
            onClick={() => setActivePanel("codes")}
            className="primary"
            type="button">
            Open Codes Console
          </button>
        </article>
      </section>

      {/* Conditionally Rendered Service Panels */}
      {activePanel && (
        <section className="service-panels">{renderActivePanel()}</section>
      )}

      {/* Log Panel */}
      <LogPanel />
    </>
  );
}
