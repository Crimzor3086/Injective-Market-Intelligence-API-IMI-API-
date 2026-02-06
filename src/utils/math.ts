export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

export function ewma(values: number[], lambda = 0.94): number {
  if (values.length === 0) {
    return 0;
  }
  let weighted = values[0];
  for (let i = 1; i < values.length; i += 1) {
    weighted = lambda * weighted + (1 - lambda) * values[i];
  }
  return weighted;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}
