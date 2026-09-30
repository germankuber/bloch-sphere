interface ImportMetaEnv {
  readonly VITE_BLOCH_WS_URL?: string
  readonly VITE_BLOCH_BRIDGE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
