const isDev = import.meta.env.DEV;

export const logInfo = (message: string, payload?: unknown) => {
  if (isDev) {
    console.info(`[dashboard] ${message}`, payload ?? "");
  }
};

export const logError = (message: string, payload?: unknown) => {
  console.error(`[dashboard] ${message}`, payload ?? "");
};

export const isFeatureEnabled = (flag: string, defaultValue = false): boolean => {
  const raw = import.meta.env.VITE_FEATURE_FLAGS;
  if (!raw) return defaultValue;
  return raw
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean)
    .includes(flag);
};
