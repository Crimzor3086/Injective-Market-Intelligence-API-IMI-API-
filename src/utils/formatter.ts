export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
