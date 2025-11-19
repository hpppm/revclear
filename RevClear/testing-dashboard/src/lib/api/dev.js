import { apiClient } from './apiClient';

export const dev = {
  /**
   * Fetches the dashboard's initial configuration.
   * @returns {Promise<any>}
   */
  getConfig: () => {
    return apiClient('/dev/config');
  },

  /**
   * Fetches the health status of backend services.
   * @returns {Promise<any>}
   */
  getStatus: () => {
    return apiClient('/dev/status');
  },

  /**
   * Checks the connectivity to the Cognito service.
   * @returns {Promise<any>}
   */
  checkCognito: () => {
    return apiClient('/dev/cognito/check');
  },
};
