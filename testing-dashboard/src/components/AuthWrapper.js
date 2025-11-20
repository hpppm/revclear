"use client";

import React, { useEffect, useState } from "react";
import Login from "./Login";
import { decodeEmailFromToken } from "../lib/utils/jwtDecoder";

/**
 * A wrapper component that protects its children from unauthenticated access.
 * It checks for a token in local storage. If a token exists, it renders the
 * children with user and logout props. Otherwise, it renders the Login component.
 */
export default function AuthWrapper({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("revclear-token");
    if (storedToken) {
      setTimeout(() => {
        setToken(storedToken);
        setUser({ email: decodeEmailFromToken(storedToken) });
        setIsLoaded(true);
      }, 0);
      return;
    }
  }, []);
  useEffect(() => {
    if (!isLoaded) {
      setTimeout(() => setIsLoaded(true), 0);
    }
  }, [isLoaded]);

  /**
   * Callback function passed to the Login component.
   * It sets the token in state and local storage upon successful login.
   * @param {object} authResult - The AuthenticationResult from Cognito.
   */
  const handleLoginSuccess = (authResult) => {
    const newToken = authResult.IdToken;
    if (newToken) {
      window.localStorage.setItem("revclear-token", newToken);
      setToken(newToken);
      setUser({ email: decodeEmailFromToken(newToken) });
    }
  };

  /**
   * Handles user logout by clearing the token and user state.
   */
  const handleLogout = () => {
    window.localStorage.removeItem("revclear-token");
    setToken(null);
    setUser(null);
  };

  // While we are checking for the token, show a loading shell.
  if (!isLoaded) {
    return (
      <main className="loading-shell">
        <div className="loading-panel"></div>
      </main>
    );
  }

  // If a token exists, the user is authenticated. Render the protected content.
  if (token) {
    // Clone the child element (e.g., the Dashboard) and inject props into it.
    return React.cloneElement(children, { user, onLogout: handleLogout });
  }

  // If no token, the user is not authenticated. Render the Login component.
  return <Login onLoginSuccess={handleLoginSuccess} />;
}
