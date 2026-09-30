export const WS_PORT = 7331
export const APP_DEV_PORT = 5180
export const APP_PREVIEW_PORT = 4180

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'] as const

export const DEFAULT_APP_ORIGINS: readonly string[] = [APP_DEV_PORT, APP_PREVIEW_PORT].flatMap((port) =>
  LOOPBACK_HOSTS.map((host) => `http://${host}:${port}`),
)
