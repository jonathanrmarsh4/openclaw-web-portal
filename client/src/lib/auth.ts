import { create } from 'zustand';
import axios from 'axios';

export interface User {
  email: string;
  name: string;
  picture?: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  initializeAuth: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  startOAuthFlow: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  loading: true,
  error: null,

  initializeAuth: () => {
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, loading: false });
      } catch {
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }

    // Check URL for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleOAuthCallback(code).catch((error) => {
        set({ error: error.message });
      });
    }
  },

  login: (token, user) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    set({ token, user, error: null });
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    set({ token: null, user: null });
  },

  startOAuthFlow: async () => {
    try {
      const response = await axios.post('/auth/login');
      window.location.href = response.data.url;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'OAuth flow failed',
      });
    }
  },
}));

async function handleOAuthCallback(code: string) {
  try {
    const response = await axios.get('/auth/callback', { params: { code } });
    const { token, user } = response.data;

    useAuthStore.getState().login(token, user);

    // Remove code from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'OAuth callback failed'
    );
  }
}
