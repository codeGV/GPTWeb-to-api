// Server configuration shared by the background worker and extension pages.
// Keep this module free of side effects: extension pages import it, and anything
// imported from the background entry would run the background code in that page.

const LIVE_API_BASE_URL = "https://apibeam.bitsmall.in/";

/** Ensures a trailing slash, since URLs are built as `${base}app/...`. */
export const withTrailingSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

/**
 * Server used when no custom URL is saved. Set at build time through
 * VITE_API_BASE_URL (e.g. in .env.development.local); falls back to the live server.
 */
export const DEFAULT_API_BASE_URL = withTrailingSlash(
  import.meta.env.VITE_API_BASE_URL?.trim() || LIVE_API_BASE_URL
);

/** chrome.storage.local key holding the user's custom server URL (absent = default). */
export const CUSTOM_API_BASE_URL_KEY = "apiBaseUrl";

/** Validates and normalizes a user-entered server URL; returns null when invalid. */
export const normalizeServerUrl = (input: string): string | null => {
  let value = input.trim();
  if (!value) return null;
  // Allow "localhost:3000" or "my-server.com" without a scheme
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `http://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.search = "";
    url.hash = "";
    return withTrailingSlash(url.toString());
  } catch {
    return null;
  }
};

export type ServerConfig = {
  defaultUrl: string;
  customUrl: string | null;
  activeUrl: string;
};
