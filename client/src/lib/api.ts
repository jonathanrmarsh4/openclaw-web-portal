import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from './auth';

let apiInstance: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!apiInstance) {
    apiInstance = axios.create({
      baseURL: '/api',
      timeout: 10000,
    });

    // Add token to all requests
    apiInstance.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors (token expired)
    apiInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    );
  }
  return apiInstance;
}

// Portfolio API
export const portfolioAPI = {
  getStatus: async () => {
    const response = await getApiClient().get('/portfolio');
    return response.data;
  },
};

// Jobs API
export const jobsAPI = {
  list: async () => {
    const response = await getApiClient().get('/jobs');
    return response.data;
  },
  run: async (jobId: string) => {
    const response = await getApiClient().post(`/jobs/${jobId}/run`);
    return response.data;
  },
  getHistory: async (jobId: string) => {
    const response = await getApiClient().get(`/jobs/${jobId}/history`);
    return response.data;
  },
};

// Sessions API
export const sessionsAPI = {
  list: async () => {
    const response = await getApiClient().get('/sessions');
    return response.data;
  },
};

// Memory API
export const memoryAPI = {
  get: async () => {
    const response = await getApiClient().get('/memory');
    return response.data;
  },
  save: async (content: string) => {
    const response = await getApiClient().post('/memory', { content });
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  send: async (channel: string, target: string, message: string) => {
    const response = await getApiClient().post('/messages/send', {
      channel,
      target,
      message,
    });
    return response.data;
  },
};

// Agents API
export const agentsAPI = {
  list: async () => {
    const response = await getApiClient().get('/agents');
    return response.data;
  },
  spawn: async (name: string, task: string) => {
    const response = await getApiClient().post('/agents/spawn', { name, task });
    return response.data;
  },
  kill: async (agentId: string) => {
    const response = await getApiClient().post(`/agents/${agentId}/kill`);
    return response.data;
  },
};

// System API
export const systemAPI = {
  getAuditLog: async () => {
    const response = await getApiClient().get('/audit-log');
    return response.data;
  },
  getHealth: async () => {
    const response = await getApiClient().get('/health');
    return response.data;
  },
};
