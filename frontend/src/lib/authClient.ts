import { createAuthClient } from 'better-auth/react';
import { getWebEnv } from '../env';

export const authClient = createAuthClient({
  baseURL: getWebEnv().PUBLIC_API_URL,
  fetchOptions: {
    credentials: 'include',
  },
});
