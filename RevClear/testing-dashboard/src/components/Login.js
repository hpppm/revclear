"use client";

import { useState } from 'react';
import { auth } from '../lib/api/auth';
import Button from './ui/Button';
import Card from './ui/Card'; // New import

export default function Login({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let payload;
      if (view === 'login') {
        payload = await auth.signIn(email, password);
      } else {
        payload = await auth.signUp(email, password);
      }

      if (payload && payload.AuthenticationResult) {
        // If login or signup-autologin is successful, call the callback
        onLoginSuccess(payload.AuthenticationResult);
      } else if (view === 'signup') {
        // Handle cases where signup doesn't auto-login and requires confirmation
        alert('Signup successful! If not automatically logged in, please check your email to confirm your account before logging in.');
        setView('login'); // Switch to login view after successful signup
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setError('');
    setEmail('');
    setPassword('');
    setView(view === 'login' ? 'signup' : 'login');
  };

  return (
    <Card className="auth-panel">
      <div className="login-card">
        <div className="login-card-header">
          <h3>{view === 'login' ? 'Test Environment Login' : 'Create Sandbox User'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="form-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder={view === 'login' ? "clinic-admin@example.com" : "new-tester@example.com"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder={view === 'login' ? "••••••••" : "Minimum 8 characters"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : (view === 'login' ? 'Sign in to Sandbox' : 'Create Sandbox Account')}
          </Button>
          
          {error && <p className="status-copy error-copy">{error}</p>}
          
          <p className="status-copy">
            {view === 'login' 
              ? 'Local test mode — not signed in.'
              : 'This calls /api/auth/signup against your configured Cognito pool.'
            }
          </p>
          
          <p className="form-toggle">
            {view === 'login' ? (
              <>
                Need another sandbox user?
                <Button onClick={toggleView} type="button" className="link-button">
                  Request sandbox user
                </Button>
              </>
            ) : (
              <>
                Ready to log in?
                <Button onClick={toggleView} type="button" className="link-button">
                  Back to sign in
                </Button>
              </>
            )}
          </p>
        </form>
      </div>
    </Card>
  );
}
