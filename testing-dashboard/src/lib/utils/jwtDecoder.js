import { jwtDecode } from 'jwt-decode';

/**
 * Decodes a Cognito token (Access or ID) to extract a friendly identifier.
 *
 * @param {string} token The JWT token from Cognito.
 * @returns {string|null} The user's email/username if the token contains one, otherwise null.
 */
export const decodeEmailFromToken = (token) => {
  if (!token) {
    return null;
  }

  try {
    // Decode the JWT. The result is a JSON object with the token's claims.
    const decodedToken = jwtDecode(token);

    // Prefer the email claim (present in ID tokens), otherwise fall back to username (present in Access tokens)
    if (decodedToken) {
      if (typeof decodedToken.email === 'string') {
        return decodedToken.email;
      }
      if (typeof decodedToken.username === 'string') {
        return decodedToken.username;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};
