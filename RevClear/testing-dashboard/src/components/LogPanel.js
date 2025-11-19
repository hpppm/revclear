"use client";

import { useLogger } from '@/contexts/LogContext';

// This component displays the log entries from the LogContext.
export default function LogPanel() {
  const { logs } = useLogger();

  // Simple function to format details for display
  const formatDetails = (details) => {
    if (!details) return null;
    // Avoid showing large, unformatted objects
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    return String(details);
  };

  return (
    <section className="log">
      <div className="log-header">
        <strong>Logs &amp; feedback</strong>
      </div>
      <div id="logEntries">
        {logs.length === 0 && <div className="log-entry info">No log entries yet.</div>}
        {logs.map((log) => (
          <div key={log.id} className={`log-entry ${log.type}`}>
            <p><strong>[{log.timestamp}] {log.message}</strong></p>
          </div>
        ))}
      </div>
    </section>
  );
}
