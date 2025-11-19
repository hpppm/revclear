"use client";

import { useState, useEffect } from 'react';
import { dev } from '../lib/api/dev';
import { useLogger } from '@/contexts/LogContext';
import Button from './ui/Button';
import Card from './ui/Card'; // New import

export default function CognitoPanel({ userPoolId, clientId }) {
  const { log } = useLogger();
  const [status, setStatus] = useState({ message: 'Waiting for health check...', type: 'neutral' });
  const [isLoading, setIsLoading] = useState(false);

  const handleCheck = async () => {
    setIsLoading(true);
    setStatus({ message: 'Checking Cognito...', type: 'neutral' });
    try {
      const payload = await dev.checkCognito();
      setStatus({ message: 'Cognito responded successfully.', type: 'success' });
      log('Cognito Check Success', 'success', payload);
    } catch (error) {
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
      log('Cognito Check Error', 'error', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleCheck();
  }, []); // Empty array ensures this runs only once on mount

  return (
    <Card header={<h3>Cognito testing console</h3>} className="service-panel">
      <div className={`callout ${status.type}`} id="cognito-connection">
        <strong>Status:</strong>
        <span id="cognito-status-text">{status.message}</span>
      </div>
      <p className="details" id="cognito-status-details">
        This panel checks if the backend can communicate with the configured AWS Cognito User Pool. Your Pool ID is <code>{userPoolId || 'not set'}</code> and your Client ID is <code>{clientId || 'not set'}</code>.
      </p>
      <Button onClick={handleCheck} variant="secondary" type="button" disabled={isLoading}>
        {isLoading ? 'Checking...' : 'Check connectivity'}
      </Button>
    </Card>
  );
}
