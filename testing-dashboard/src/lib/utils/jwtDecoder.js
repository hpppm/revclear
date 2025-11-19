import { jwtDecode } from 'jwt-decode';

/**
 * Decodes a Cognito ID token to extract the user's email address.
 *
 * @param {string} token The JWT ID token from Cognito.
 * @returns {string|null} The user's email if the token is valid and contains an email, otherwise null.
 */
export const decodeEmailFromToken = (token) => {
  if (!token) {
    return null;
  }

  try {
    // Decode the JWT. The result is a JSON object with the token's claims.
    const decodedToken = jwtDecode(token);

    // Cognito ID tokens contain the email in the 'email' claim.
    if (decodedToken && typeof decodedToken.email === 'string') {
      return decodedToken.email;
    }

    return null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};
