import { loadWebEnv, type WebEnv } from '@bookverse/shared';

let cached: WebEnv | undefined;

export function getWebEnv(): WebEnv {
  if (!cached) {
    cached = loadWebEnv({
      PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
    });
  }
  return cached;
}
