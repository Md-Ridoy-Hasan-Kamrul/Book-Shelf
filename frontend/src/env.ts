import { loadWebEnv, type WebEnv } from '@bookverse/shared';

let cached: WebEnv | undefined;

export function getWebEnv(): WebEnv {
  if (!cached) {
    cached = loadWebEnv({
      PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
      FEATURE_USED_BOOKS: import.meta.env.FEATURE_USED_BOOKS,
      FEATURE_SPONSORED: import.meta.env.FEATURE_SPONSORED,
      FEATURE_LIVE_EVENTS: import.meta.env.FEATURE_LIVE_EVENTS,
    });
  }
  return cached;
}

export type FeatureFlags = {
  usedBooks: boolean;
  sponsored: boolean;
  liveEvents: boolean;
};

export function getFeatureFlags(): FeatureFlags {
  const env = getWebEnv();
  return {
    usedBooks: env.FEATURE_USED_BOOKS,
    sponsored: env.FEATURE_SPONSORED,
    liveEvents: env.FEATURE_LIVE_EVENTS,
  };
}
