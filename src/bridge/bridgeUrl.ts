import { WS_PORT } from '../protocol/ports'

const DEFAULT_BRIDGE_URL = `ws://localhost:${WS_PORT}`

export const buildBridgeUrl = (base: string | undefined, token: string | undefined): string => {
  const url = new URL(base?.trim() || DEFAULT_BRIDGE_URL)
  const trimmedToken = token?.trim()
  if (trimmedToken) url.searchParams.set('token', trimmedToken)
  return url.toString()
}

export const bridgeUrl = (): string =>
  buildBridgeUrl(import.meta.env.VITE_BLOCH_WS_URL, import.meta.env.VITE_BLOCH_BRIDGE_TOKEN)
