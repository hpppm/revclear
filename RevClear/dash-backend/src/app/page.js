"use client";

import { useEffect, useState } from "react";
import "./dashboard.css";
import { initializeDashboard } from "@/lib/dashboardClient";

export default function DashboardPage() {
  const apiBase =
    process.env.NEXT_PUBLIC_DASHBOARD_API_BASE ||
    (typeof window !== "undefined" && window.__DASHBOARD_API_BASE_URL) ||
    "/api";
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch(`${apiBase}/dashboard/config`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = await res.json();
        if (!cancelled) {
          initializeDashboard(payload?.config || {});
        }
      } catch (error) {
        console.error("Failed to load dashboard config:", error);
        if (!cancelled) {
          initializeDashboard();
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [apiBase, hydrated]);

  if (!hydrated) {
    return (
      <main className="loading-shell">
        <div className="loading-panel"></div>
      </main>
    );
  }

  return (
    <main>
      <div className="user-bar hidden" id="user-bar">
        <span id="user-email"></span>
        <button className="secondary" id="logout-button" type="button">
          Logout
        </button>
      </div>
      <div className="hero-container">
        <header className="panel hero-panel">
          <div>
            <p className="hero-label">Internal QA Workspace</p>
            <h1 className="hero-title">RevClear Testing Console</h1>
            <p className="hero-subtitle">
              Authenticate to exercise Cognito, S3, and DynamoDB helpers in the
              sandbox AWS account.
            </p>
          </div>
        </header>
      </div>

      <div className="console-shell">
        <section className="panel auth-panel" id="auth-panel">
          <div className="login-card">
            <div className="login-card-header">
              <h3 data-form-title="login">Test Environment Login</h3>
              <h3 data-form-title="signup" className="hidden">
                Create sandbox user
              </h3>
            </div>

            <form
              id="login-form"
              data-form="login"
              method="post"
              className="login-form">
              <label className="form-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="clinic-admin@example.com"
                  required
                />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </label>
              <button className="primary login-button" type="submit">
                Sign in to sandbox
              </button>
              <p className="status-copy">
                <span id="auth-status">Local test mode — not signed in.</span>
              </p>
              <p className="form-toggle">
                Need another sandbox user?
                <button type="button" id="showSignup" className="link-button">
                  Request sandbox user
                </button>
              </p>
            </form>

            <form
              id="signup-form"
              data-form="signup"
              className="hidden login-form"
              method="post">
              <label className="form-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="new-tester@example.com"
                  required
                />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  required
                />
              </label>
              <button className="primary login-button" type="submit">
                Create sandbox account
              </button>
              <p className="status-copy">
                This calls <code>/api/auth/signup</code> against your configured
                Cognito pool. Monitor the log panel for details.
              </p>
              <p className="form-toggle">
                Ready to log in?
                <button type="button" id="showLogin" className="link-button">
                  Back to sign in
                </button>
              </p>
            </form>
          </div>
        </section>

        <section className="panel secure-panel" id="auth-gate">
          <div className="secure-callout">
            <span className="secure-icon">🛡</span>
            <div>
              <strong>Secure testing</strong>
              <p>
                Sign in to call Cognito and S3 helpers. Actions stay in
                sandboxed AWS resources — no production data is touched.
              </p>
              <small>
                Need real clinic access? Contact your administrator.
              </small>
            </div>
          </div>
        </section>
      </div>

      <section className="service-card-grid hidden" data-auth-required>
        <article className="service-card">
          <header>
            <span>Cognito</span>
            <span className="pill warning" data-card-status="awsCognito">
              Waiting
            </span>
          </header>
          <p>
            Confirm pool/client IDs, create sandbox users, and grab IdTokens for
            AWS helpers.
          </p>
          <button
            className="primary"
            data-open-panel="awsCognito"
            type="button">
            Open Cognito console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>S3 Bucket</span>
            <span className="pill warning" data-card-status="awsS3">
              Waiting
            </span>
          </header>
          <p>
            Upload, list, and download the sample encounter file in your sandbox
            bucket.
          </p>
          <button className="primary" data-open-panel="awsS3" type="button">
            Open S3 console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>DynamoDB</span>
            <span className="pill warning" data-card-status="awsDynamoDb">
              Waiting
            </span>
          </header>
          <p>
            Inspect the configured test table to confirm DynamoDB helpers are
            wired up.
          </p>
          <button
            className="primary"
            data-open-panel="awsDynamoDb"
            type="button">
            Open DynamoDB console
          </button>
        </article>
        <article className="service-card">
          <header>
            <span>Encryption</span>
            <span className="pill warning" data-card-status="awsEncryption">
              Waiting
            </span>
          </header>
          <p>
            Monitor PHI encryption powered by AWS Key Management Service (KMS)
            through our backend crypto helpers.
          </p>
          <button className="primary" data-open-panel="awsEncryption" type="button">
            View encryption console
          </button>
        </article>
      </section>

      <section className="service-panels hidden" data-auth-required>
        <article
          className="panel service-panel hidden"
          data-service-panel="awsCognito">
          <div className="panel-heading">
            <h3>Cognito testing console</h3>
          </div>
          <div className="callout neutral" id="cognito-connection">
            <strong>Status:</strong>
            <span id="cognito-status-text">Waiting for health check...</span>
          </div>
          <p className="details" id="cognito-status-details">
            When you authenticate, we call <code>/api/dashboard/status</code> to
            confirm Cognito is reachable with the configured pool and client
            IDs. If the connection fails, this panel will show what’s missing
            (usually <code>AWS_USER_POOL_ID</code>, <code>AWS_CLIENT_ID</code>,
            or Cognito credentials).
          </p>
          <button className="secondary" id="cognito-check" type="button">
            Check connectivity
          </button>
          <div
            className="check-indicator hidden"
            id="cognito-check-indicator">
            <span className="spinner" aria-hidden="true"></span>
            <span id="cognito-check-message">Checking Cognito…</span>
          </div>
          <p className="details">
            Use the log panel to inspect each response. Authentication tokens
            are automatically redacted before they’re displayed.
          </p>
        </article>
        <article
          className="panel service-panel hidden"
          data-service-panel="awsS3">
          <div className="panel-heading">
            <h3>S3 testing console</h3>
          </div>
          <div className="s3-panel-grid">
            <div className="s3-card">
              <div className="s3-card-header">
                <span>📁 Configuration</span>
                <small>
                  Choose the bucket target and describe the object metadata.
                </small>
              </div>
              <div className="s3-field-grid">
                <div className="s3-field">
                  <span className="s3-label">Bucket</span>
                  <div className="s3-input-wrap">
                    <span className="s3-icon">🗃️</span>
                    <div className="s3-readonly" id="s3-bucket-name"></div>
                  </div>
                </div>
                <label className="s3-field">
                  <span className="s3-label">File path in bucket</span>
                  <div className="s3-input-wrap">
                    <span className="s3-icon">📁</span>
                    <input
                      id="dashboard-file-key"
                      type="text"
                      placeholder="test-reports/encounter-a.json"
                      className="s3-input"
                    />
                  </div>
                </label>
                <label className="s3-field">
                  <span className="s3-label">Content type</span>
                  <div className="s3-input-wrap">
                    <span className="s3-icon">🔖</span>
                    <input
                      id="dashboard-file-contentType"
                      type="text"
                      placeholder="application/json"
                      className="s3-input"
                    />
                  </div>
                </label>
              </div>
              <div className="s3-inline-field">
                <span className="s3-label">List files in path</span>
                <div className="s3-input-wrap">
                  <span className="s3-icon">📂</span>
                  <input
                    id="s3-prefix"
                    type="text"
                    placeholder="test-reports/"
                    className="s3-input"
                  />
                </div>
              </div>
            </div>

            <div className="s3-divider"></div>

            <div className="s3-card">
              <div className="s3-card-header">
                <span>🧾 File contents</span>
                <small>
                  Paste JSON or generate a realistic encounter payload.
                </small>
              </div>
              <textarea
                id="dashboard-file-body"
                rows={10}
                spellCheck={false}
                className="s3-editor"></textarea>
              <p className="s3-editor-status" id="dashboard-file-message">
                Define the file contents you want to send to S3.
              </p>
              <button
                className="s3-btn cyan"
                id="generate-sample-file"
                type="button">
                ✨ Generate sample JSON
              </button>
            </div>

            <div className="s3-divider"></div>

            <div className="s3-card">
              <div className="s3-card-header">
                <span>☁️ Actions &amp; feedback</span>
                <small>
                  Run sandbox helpers and inspect the responses below.
                </small>
              </div>
              <div className="s3-action-grid">
                <button
                  className="s3-btn primary"
                  data-action="s3:upload"
                  type="button">
                  Upload to S3
                </button>
                <button
                  className="s3-btn cyan"
                  data-action="s3:list"
                  type="button">
                  List files
                </button>
              </div>
              <div className="s3-action-status" id="s3-action-status">
                Ready to run S3 helpers.
              </div>
              <div className="s3-list-results">
                <span className="s3-label">Latest list results</span>
                <ul id="s3-list-output">
                  <li>No files listed yet.</li>
                </ul>
              </div>
              <small>Each action logs the request/response below.</small>
            </div>
          </div>
        </article>
        <article
          className="panel service-panel hidden"
          data-service-panel="awsDynamoDb">
          <div className="panel-heading">
            <h3>DynamoDB testing console</h3>
          </div>
          <p className="details">
            Table: <code id="dynamodb-table"></code>
          </p>
          <small>
            Come back once DynamoDB tests surface; this card is synced with{" "}
            <code>/api/dashboard/status</code>.
          </small>
        </article>
        <article
          className="panel service-panel hidden"
          data-service-panel="awsEncryption">
          <div className="panel-heading">
            <h3>Encryption testing console</h3>
          </div>
          <div className="callout neutral">
            <strong>Service:</strong>
            <span>AWS Key Management Service (KMS)</span>
          </div>
          <p className="details">
            Our PHI encryption helpers use AES-GCM keys derived from KMS. This
            panel tracks encryption-in-transit and encryption-at-rest tests before they are exposed
            in the main dashboard.
          </p>
          <small>
            Status: In progress — encryption APIs will surface here as soon as
            they are finalized.
          </small>
        </article>
      </section>

      <section className="log hidden" data-auth-required>
        <div className="log-header">
          <strong>Logs &amp; feedback</strong>
          <button className="secondary" id="status-refresh" type="button">
            Refresh status
          </button>
        </div>
        <div id="logEntries"></div>
      </section>
    </main>
  );
}
