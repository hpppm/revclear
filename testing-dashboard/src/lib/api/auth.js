import { apiClient } from './apiClient';

export const auth = {
  /**
   * Signs a user in.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<any>} The API response.
   */
  signIn: (email, password) => {
    return apiClient('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Signs a user up.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<any>} The API response.
   */
  signUp: (email, password) => {
    return apiClient('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};
