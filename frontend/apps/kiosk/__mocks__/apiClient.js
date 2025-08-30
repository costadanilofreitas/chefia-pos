// Mock for API Client
export class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:8001';
    this.timeout = 30000;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async get(endpoint, options = {}) {
    return Promise.resolve({ data: [], status: 200 });
  }

  async post(endpoint, data, options = {}) {
    return Promise.resolve({ data: { id: 1, ...data }, status: 201 });
  }

  async put(endpoint, data, options = {}) {
    return Promise.resolve({ data: { ...data }, status: 200 });
  }

  async patch(endpoint, data, options = {}) {
    return Promise.resolve({ data: { ...data }, status: 200 });
  }

  async delete(endpoint, options = {}) {
    return Promise.resolve({ status: 204 });
  }

  handleError(error) {
    return { error: error.message || 'Unknown error' };
  }

  isNetworkError(error) {
    return false;
  }

  isAuthError(error) {
    return false;
  }

  getErrorMessage(error) {
    return error.message || 'An error occurred';
  }
}