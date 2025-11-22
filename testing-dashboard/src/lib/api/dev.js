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

  /**
   * Checks connectivity to the Postgres RDS instance.
   * @returns {Promise<any>}
   */
  checkDbHealth: () => {
    return apiClient('/dev/db/health');
  },

  /**
   * Patients CRUD (RDS)
   */
  createPatient: (payload) => {
    return apiClient('/dev/db/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPatients: ({ patientId = null, limit = 5 } = {}) => {
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiClient(`/dev/db/patients${suffix}`);
  },

  updatePatient: (patientId, payload) => {
    return apiClient(`/dev/db/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deletePatient: (patientId) => {
    return apiClient(`/dev/db/patients/${patientId}`, {
      method: 'DELETE',
    });
  },
};
