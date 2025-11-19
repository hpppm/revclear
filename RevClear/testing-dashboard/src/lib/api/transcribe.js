import { apiClient } from './apiClient';

export const transcribe = {
  /**
   * Uploads an audio file to start transcription.
   * @param {File} audioFile - The audio file to transcribe.
   * @returns {Promise<any>} The API response.
   */
  start: (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const config = {
      method: 'POST',
      body: formData,
      headers: {}, // Let apiClient handle headers, it now correctly removes Content-Type for FormData
    };
    
    return apiClient('/transcribe', config);
  },
};
