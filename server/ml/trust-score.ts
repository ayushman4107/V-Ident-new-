import { VFFResult } from './vff';
import { CRTResult } from './crt';
import { MicroTremorResult } from './micro-tremor';
import { RPPGResult } from './rppg';

export interface TouchPressureResult {
  score: number;
  llr: number;
  pressureVariance: number;
  naturalPattern: boolean;
  suspiciousPatterns: string[];
  processingTimeMs: number;
}

export interface TrustScoreInput {
  vff: VFFResult;
  crt: CRTResult;
  microTremor: MicroTremorResult | null;
  rppg: RPPGResult | null;
  touchPressure: TouchPressureResult | null;
  deviceTier: number;
  riskLevel: number;
  isRooted: boolean;
  hardwareAttestationScore: number;
}

export type TrustZone = 'green' | 'amber' | 'red';

export interface TrustScoreResult {
  trustScore: number;
  zone: TrustZone;
  logOdds: number;
  signalBreakdown: {
    signal: string;
    score: number;
    weight: number;
    llr: number;
    contribution: number;
    available: boolean;
  }[];
  explanation: string;
  flagReasons: string[];
  processingTimeMs: number;
}

const SIGNAL_WEIGHTS: Record<string, number[]> = {
  vff:          [0.45, 0.30, 0.20],
  crt:          [0.35, 0.20, 0.15],
  ha:           [0.20, 0.15, 0.10],
  microTremor:  [0.00, 0.20, 0.15],
  rppg:         [0.00, 0.15, 0.20],
  touchPressure:[0.10, 0.10, 0.10],
  microSaccade: [0.00, 0.00, 0.10],
};

const THRESHOLDS: Record<number, { green: number; amber: number }> = {
  1: { green: 80, amber: 65 },
  2: { green: 90, amber: 72 },
  3: { green: 95, amber: 82 },
};

function getWeight(signal: string, tier: number): number {
  const tierIndex = Math.max(0, Math.min(2, tier - 1));
  return SIGNAL_WEIGHTS[signal]?.[tierIndex] ?? 0;
}

function generateExplanation(breakdown: TrustScoreResult['signalBreakdown'], zone: TrustZone, flagReasons: string[]): string {
  if (zone === 'green') {
    return 'All verification signals passed successfully. Your identity has been confirmed.';
  }

  if (flagReasons.length === 0) {
    return zone === 'amber'
      ? 'Some signals need additional verification. A secondary challenge will be presented.'
      : 'Verification could not be completed automatically. A human reviewer will check your case within 4 hours.';
  }

  const weakestSignal = breakdown
    .filter(s => s.available && s.score < 0.7)
    .sort((a, b) => a.score - b.score)[0];

  if (weakestSignal) {
    const signalNames: Record<string, string> = {
      vff: 'facial scan analysis',
      crt: 'response timing check',
      ha: 'device security check',
      microTremor: 'hand movement analysis',
      rppg: 'pulse detection',
    };
    const name = signalNames[weakestSignal.signal] || weakestSignal.signal;
    if (zone === 'amber') {
      return `Your ${name} needs a second look. This could be due to lighting or camera quality. A quick follow-up check will help confirm your identity.`;
    }
    return `Your ${name} raised a concern. ${flagReasons[0]} A human reviewer will look into this within 4 hours.`;
  }

  return zone === 'amber'
    ? 'Additional verification is needed to confirm your identity.'
    : 'Your verification has been flagged for human review. You will hear back within 4 hours.';
}

export function computeTrustScore(input: TrustScoreInput): TrustScoreResult {
  const startTime = Date.now();
  const tier = input.deviceTier;
  const breakdown: TrustScoreResult['signalBreakdown'] = [];
  const flagReasons: string[] = [];

  const vffWeight = getWeight('vff', tier);
  breakdown.push({
    signal: 'vff',
    score: input.vff.score,
    weight: vffWeight,
    llr: input.vff.llr,
    contribution: vffWeight * input.vff.llr,
    available: true,
  });
  if (input.vff.artifactsDetected) {
    flagReasons.push(...input.vff.frequencyAnomalies);
  }

  const crtWeight = getWeight('crt', tier);
  breakdown.push({
    signal: 'crt',
    score: input.crt.score,
    weight: crtWeight,
    llr: input.crt.llr,
    contribution: crtWeight * input.crt.llr,
    available: true,
  });
  if (input.crt.suspiciousPatterns.length > 0 && input.crt.score < 0.7) {
    flagReasons.push(...input.crt.suspiciousPatterns);
  }

  const haWeight = getWeight('ha', tier);
  const haLLR = input.hardwareAttestationScore >= 1.0 ? 4.0 : Math.log(input.hardwareAttestationScore / (1 - input.hardwareAttestationScore + 0.001));
  breakdown.push({
    signal: 'ha',
    score: input.hardwareAttestationScore,
    weight: haWeight,
    llr: haLLR,
    contribution: haWeight * haLLR,
    available: true,
  });

  if (input.microTremor && input.microTremor.score > 0) {
    const mtWeight = getWeight('microTremor', tier);
    breakdown.push({
      signal: 'microTremor',
      score: input.microTremor.score,
      weight: mtWeight,
      llr: input.microTremor.llr,
      contribution: mtWeight * input.microTremor.llr,
      available: true,
    });
    if (input.microTremor.suspiciousPatterns.length > 0 && input.microTremor.score < 0.7) {
      flagReasons.push(...input.microTremor.suspiciousPatterns);
    }
  } else {
    breakdown.push({
      signal: 'microTremor',
      score: 0,
      weight: 0,
      llr: 0,
      contribution: 0,
      available: false,
    });
  }

  if (input.rppg && input.rppg.score > 0) {
    const rppgWeight = getWeight('rppg', tier);
    breakdown.push({
      signal: 'rppg',
      score: input.rppg.score,
      weight: rppgWeight,
      llr: input.rppg.llr,
      contribution: rppgWeight * input.rppg.llr,
      available: true,
    });
    if (input.rppg.suspiciousPatterns.length > 0 && input.rppg.score < 0.7) {
      flagReasons.push(...input.rppg.suspiciousPatterns);
    }
  } else {
    breakdown.push({
      signal: 'rppg',
      score: 0,
      weight: 0,
      llr: 0,
      contribution: 0,
      available: false,
    });
  }

  if (input.touchPressure && input.touchPressure.score > 0) {
    const touchWeight = getWeight('touchPressure', tier);
    breakdown.push({
      signal: 'touchPressure',
      score: input.touchPressure.score,
      weight: touchWeight,
      llr: input.touchPressure.llr,
      contribution: touchWeight * input.touchPressure.llr,
      available: true,
    });
    if (input.touchPressure.suspiciousPatterns.length > 0 && input.touchPressure.score < 0.7) {
      flagReasons.push(...input.touchPressure.suspiciousPatterns);
    }
  } else {
    breakdown.push({
      signal: 'touchPressure',
      score: 0,
      weight: 0,
      llr: 0,
      contribution: 0,
      available: false,
    });
  }

  let logOdds = 0;
  for (const signal of breakdown) {
    if (signal.available) {
      logOdds += signal.contribution;
    }
  }

  if (input.microTremor && input.rppg && input.microTremor.score > 0 && input.rppg.score > 0) {
    const correlation = 0.5 + Math.random() * 0.4;
    const bonus = 0.5 * Math.max(0, correlation);
    logOdds += bonus;
  }

  if (input.isRooted) {
    logOdds = Math.min(logOdds, 0.847);
    flagReasons.push('Device appears to be rooted or jailbroken');
  }

  const pHuman = 1 / (1 + Math.exp(-logOdds));
  const trustScore = Math.round(pHuman * 1000) / 10;

  const thresholds = THRESHOLDS[input.riskLevel] || THRESHOLDS[1];
  let zone: TrustZone;
  if (trustScore >= thresholds.green) {
    zone = 'green';
  } else if (trustScore >= thresholds.amber) {
    zone = 'amber';
  } else {
    zone = 'red';
  }

  const explanation = generateExplanation(breakdown, zone, flagReasons);

  return {
    trustScore,
    zone,
    logOdds: Math.round(logOdds * 1000) / 1000,
    signalBreakdown: breakdown,
    explanation,
    flagReasons,
    processingTimeMs: Date.now() - startTime,
  };
}
