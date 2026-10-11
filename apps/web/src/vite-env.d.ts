/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the ReviewLoop API in production builds, e.g. https://reviewloop-api.onrender.com */
  readonly VITE_API_URL?: string;
}
