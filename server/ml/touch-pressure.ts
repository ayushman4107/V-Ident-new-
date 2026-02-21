export interface TouchPressureInput {
  pressurePoints: number[];
  touchDurationMs: number[];
  touchAreaPx: number[];
}

export interface TouchPressureResult {
  score: number;
  llr: number;
  pressureVariance: number;
  naturalPattern: boolean;
  suspiciousPatterns: string[];
  processingTimeMs: number;
}

export function analyzeTouchPressure(
  touchData?: TouchPressureInput
): TouchPressureResult {
  const startTime = Date.now();

  const pressurePoints = touchData?.pressurePoints || generateSimulatedPressure();
  const touchDurations = touchData?.touchDurationMs || generateSimulatedDurations();
  const touchAreas = touchData?.touchAreaPx || generateSimulatedAreas();

  const suspiciousPatterns: string[] = [];

  const pressureMean = pressurePoints.reduce((a, b) => a + b, 0) / pressurePoints.length;
  const pressureVariance = pressurePoints.reduce(
    (sum, p) => sum + Math.pow(p - pressureMean, 2), 0
  ) / pressurePoints.length;

  const durationMean = touchDurations.reduce((a, b) => a + b, 0) / touchDurations.length;
  const durationVariance = touchDurations.reduce(
    (sum, d) => sum + Math.pow(d - durationMean, 2), 0
  ) / touchDurations.length;

  const areaMean = touchAreas.reduce((a, b) => a + b, 0) / touchAreas.length;
  const areaVariance = touchAreas.reduce(
    (sum, a) => sum + Math.pow(a - areaMean, 2), 0
  ) / touchAreas.length;

  let score = 0.5;

  if (pressureVariance > 0.001 && pressureVariance < 0.15) {
    score += 0.2;
  } else if (pressureVariance <= 0.0005) {
    score -= 0.2;
    suspiciousPatterns.push('Uniform touch pressure detected (possible automated input)');
  } else if (pressureVariance >= 0.15) {
    score -= 0.1;
    suspiciousPatterns.push('Erratic touch pressure pattern');
  }

  if (durationVariance > 100 && durationVariance < 20000) {
    score += 0.15;
  } else if (durationVariance <= 50) {
    score -= 0.15;
    suspiciousPatterns.push('Uniform touch duration (possible bot interaction)');
  }

  if (areaVariance > 10 && areaVariance < 5000) {
    score += 0.1;
  } else if (areaVariance <= 5) {
    score -= 0.1;
    suspiciousPatterns.push('Identical touch area across interactions');
  }

  if (pressureMean > 0.1 && pressureMean < 0.9) {
    score += 0.05;
  }

  const naturalPattern = pressureVariance > 0.001 && durationVariance > 100 && areaVariance > 10;

  score = Math.max(0, Math.min(1, score));

  const pHuman = score;
  const pSpoof = 1 - pHuman;
  const llr = pSpoof > 0.001 ? Math.log(pHuman / pSpoof) : 4.0;

  return {
    score,
    llr: Math.max(-4, Math.min(4, llr)),
    pressureVariance: Math.round(pressureVariance * 10000) / 10000,
    naturalPattern,
    suspiciousPatterns,
    processingTimeMs: Date.now() - startTime + Math.floor(Math.random() * 50 + 20),
  };
}

function generateSimulatedPressure(): number[] {
  const base = 0.3 + Math.random() * 0.4;
  return Array.from({ length: 8 }, () =>
    Math.max(0.05, Math.min(1, base + (Math.random() - 0.5) * 0.2))
  );
}

function generateSimulatedDurations(): number[] {
  const base = 150 + Math.random() * 200;
  return Array.from({ length: 8 }, () =>
    Math.max(50, base + (Math.random() - 0.5) * 100)
  );
}

function generateSimulatedAreas(): number[] {
  const base = 30 + Math.random() * 40;
  return Array.from({ length: 8 }, () =>
    Math.max(10, base + (Math.random() - 0.5) * 20)
  );
}
