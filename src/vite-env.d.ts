/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Default GPT Web to API server URL. Falls back to the live server when unset. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
