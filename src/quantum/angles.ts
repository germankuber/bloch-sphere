export const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI

export const formatDegrees = (radians: number, fractionDigits = 0): string =>
  `${radiansToDegrees(radians).toFixed(fractionDigits)}°`
