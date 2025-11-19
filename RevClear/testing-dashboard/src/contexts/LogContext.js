"use client";

import { createContext, useState, useCallback, useContext } from 'react';

// Create the context
const LogContext = createContext(null);

/**
 * Custom hook to use the LogContext.
 * @returns {{logs: Array, log: Function}}
 */
export const useLogger = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }
  return context;
};

/**
 * Provider component that wraps the application and provides logging functionality.
 */
export function LogProvider({ children }) {
  const [logs, setLogs] = useState([]);

  const log = useCallback((message, type = 'info', details = null) => {
    const newLog = {
      id: Date.now() + Math.random(), // Simple unique ID
      timestamp: new Date().toISOString(),
      message,
      type,
      details,
    };
    // Add the new log to the beginning of the array and keep up to a max number of logs
    setLogs(currentLogs => [newLog, ...currentLogs].slice(0, 20));
  }, []);

  const value = { logs, log };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
}
