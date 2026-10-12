/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the ReviewLoop API, only when the dashboard is hosted somewhere else. */
  readonly VITE_API_URL?: string;
}
