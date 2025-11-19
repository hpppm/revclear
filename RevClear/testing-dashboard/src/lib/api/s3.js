import { apiClient } from './apiClient';

export const s3 = {
  /**
   * Uploads a file to S3.
   * @param {string} key - The object key (path) in the bucket.
   * @param {any} body - The content of the file.
   * @param {string} contentType - The MIME type of the file.
   * @returns {Promise<any>} The API response.
   */
  upload: (key, body, contentType) => {
    return apiClient('/dev/s3/upload', {
      method: 'POST',
      body: JSON.stringify({ key, body, contentType }),
    });
  },

  /**
   * Lists files in S3 under a given prefix.
   * @param {string} [prefix] - The optional prefix to filter by.
   * @returns {Promise<any>} The API response.
   */
  list: (prefix) => {
    const endpoint = prefix ? `/dev/s3/list?prefix=${encodeURIComponent(prefix)}` : '/dev/s3/list';
    return apiClient(endpoint);
  },

  /**
   * Deletes an object from S3.
   * @param {string} key - The key of the object to delete.
   * @returns {Promise<any>} The API response.
   */
  deleteObject: (key) => {
    return apiClient('/dev/s3/object', {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    });
  },
};
