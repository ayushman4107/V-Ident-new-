import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { analyzeVisualFrequencyForensics } from "./ml/vff";
import { analyzeCognitiveResponseTiming } from "./ml/crt";
import { analyzeMicroTremor } from "./ml/micro-tremor";
import { analyzeRPPG } from "./ml/rppg";
import { computeTrustScore } from "./ml/trust-score";
import { randomUUID } from "crypto";

function generateRecoveryKey(): string {
  const words = [
    'alpha', 'bravo', 'coral', 'delta', 'eagle', 'frost', 'globe', 'haven',
    'ivory', 'jade', 'kite', 'lunar', 'maple', 'noble', 'ocean', 'pearl',
    'quartz', 'river', 'solar', 'terra', 'ultra', 'vivid', 'wave', 'xenon',
  ];
  const selected: string[] = [];
  for (let i = 0; i < 8; i++) {
    selected.push(words[Math.floor(Math.random() * words.length)]);
  }
  return selected.join('-');
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.post('/api/enroll', async (req, res) => {
    try {
      const { deviceTier, accessibilityProfile } = req.body;

      if (!deviceTier || deviceTier < 1 || deviceTier > 3) {
        return res.status(400).json({ error: 'Invalid device tier. Must be 1, 2, or 3.' });
      }

      const recoveryKey = generateRecoveryKey();
      const templateHash = randomUUID();

      const user = await storage.enrollUser({
        deviceTier: deviceTier,
        accessibilityProfile: accessibilityProfile || 'standard',
        recoveryKeyHash: Buffer.from(recoveryKey).toString('base64'),
        templateHash,
      });

      res.json({
        userId: user.id,
        recoveryKey,
        deviceTier: user.deviceTier,
        accessibilityProfile: user.accessibilityProfile,
        enrolledAt: user.enrolledAt,
      });
    } catch (err) {
      console.error('Enrollment error:', err);
      res.status(500).json({ error: 'Enrollment failed' });
    }
  });

  app.post('/api/verify', async (req, res) => {
    try {
      const {
        userId,
        riskLevel = 1,
        deviceTier = 1,
        imageData,
        responseTimes,
        imuData,
        facialData,
        isRooted = false,
      } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const tier = deviceTier;
      const risk = Math.max(1, Math.min(3, riskLevel));

      const vffResult = analyzeVisualFrequencyForensics(
        imageData || { width: 640, height: 480, frameCount: 15, fps: 15 },
        tier
      );

      const crtResult = analyzeCognitiveResponseTiming(
        responseTimes || [350, 420, 380, 510, 390],
        'visual_follow'
      );

      let microTremorResult = null;
      if (tier >= 2 && imuData && imuData.length > 0) {
        microTremorResult = analyzeMicroTremor(imuData, tier);
      }

      let rppgResult = null;
      if (tier >= 2 && facialData) {
        rppgResult = analyzeRPPG(facialData, tier);
      }

      const haScore = isRooted ? 0.3 : 0.95 + Math.random() * 0.05;

      const trustResult = computeTrustScore({
        vff: vffResult,
        crt: crtResult,
        microTremor: microTremorResult,
        rppg: rppgResult,
        deviceTier: tier,
        riskLevel: risk,
        isRooted,
        hardwareAttestationScore: haScore,
      });

      const verification = await storage.createVerification({
        userId,
        trustScore: trustResult.trustScore,
        zone: trustResult.zone,
        riskLevel: risk,
        signalBreakdown: trustResult.signalBreakdown,
        explanation: trustResult.explanation,
        flagReasons: trustResult.flagReasons,
        reviewStatus: trustResult.zone === 'green' ? undefined : 'pending',
      });

      if (trustResult.zone === 'amber' || trustResult.zone === 'red') {
        await storage.createReviewCase({
          verificationId: verification.id,
          userId,
          trustScore: trustResult.trustScore,
          zone: trustResult.zone,
          signalBreakdown: trustResult.signalBreakdown,
          explanation: trustResult.explanation,
          flagReasons: trustResult.flagReasons,
          status: 'pending',
        });
      }

      const totalProcessingTime =
        vffResult.processingTimeMs +
        crtResult.processingTimeMs +
        (microTremorResult?.processingTimeMs || 0) +
        (rppgResult?.processingTimeMs || 0) +
        trustResult.processingTimeMs;

      res.json({
        verificationId: verification.id,
        trustScore: trustResult.trustScore,
        zone: trustResult.zone,
        explanation: trustResult.explanation,
        flagReasons: trustResult.flagReasons,
        signalBreakdown: trustResult.signalBreakdown.map((s: any) => ({
          signal: s.signal,
          score: Math.round(s.score * 100),
          weight: s.weight,
          available: s.available,
        })),
        processingTimeMs: totalProcessingTime,
        riskLevel: risk,
        deviceTier: tier,
        signals: {
          vff: {
            score: vffResult.score,
            artifactsDetected: vffResult.artifactsDetected,
            anomalies: vffResult.frequencyAnomalies,
          },
          crt: {
            score: crtResult.score,
            avgLatency: crtResult.averageLatencyMs,
            jitter: crtResult.jitterMs,
          },
          microTremor: microTremorResult ? {
            score: microTremorResult.score,
            frequency: microTremorResult.dominantFrequencyHz,
            natural: microTremorResult.isNaturalTremor,
          } : null,
          rppg: rppgResult ? {
            score: rppgResult.score,
            heartRate: rppgResult.heartRateBPM,
            channel: rppgResult.channelUsed,
            crossRegion: rppgResult.crossRegionConsistency,
          } : null,
        },
      });
    } catch (err) {
      console.error('Verification error:', err);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  app.get('/api/verification/:id', async (req, res) => {
    try {
      const verification = await storage.getVerification(req.params.id);
      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }

      const reviewCase = await storage.getReviewCaseByVerification(req.params.id);

      res.json({
        ...verification,
        review: reviewCase || null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch verification' });
    }
  });

  app.get('/api/user/:userId/verifications', async (req, res) => {
    try {
      const verifications = await storage.getUserVerifications(req.params.userId);
      res.json(verifications);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch verifications' });
    }
  });

  app.get('/api/reviews/pending', async (req, res) => {
    try {
      const reviews = await storage.getPendingReviews();
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/reviews/:id/resolve', async (req, res) => {
    try {
      const { status, officerNotes, videoMeetingLink, videoMeetingTime } = req.body;

      const updated = await storage.updateReviewCase(req.params.id, {
        status,
        officerNotes,
        videoMeetingLink,
        videoMeetingTime,
        resolvedAt: new Date().toISOString(),
        assignedOfficer: 'Officer-' + Math.floor(Math.random() * 100),
      });

      if (!updated) {
        return res.status(404).json({ error: 'Review case not found' });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve review' });
    }
  });

  app.post('/api/device-profile', async (req, res) => {
    try {
      const { ramGB, cameraMP, hasTEE, benchmarkScore } = req.body;

      let tier = 1;
      if (benchmarkScore > 1500 || (ramGB >= 8 && cameraMP >= 12 && hasTEE)) {
        tier = 3;
      } else if (benchmarkScore > 500 || (ramGB >= 6 && cameraMP >= 16)) {
        tier = 2;
      }

      const availableSignals = [];
      availableSignals.push('VFF', 'CRT', 'HA');
      if (tier >= 2) {
        availableSignals.push('Micro-tremor', 'rPPG');
      }
      if (tier >= 3) {
        availableSignals.push('Touch Pressure', 'Micro-saccade');
      }

      res.json({
        tier,
        availableSignals,
        maxModelSizeMB: tier === 1 ? 15 : tier === 2 ? 40 : 80,
        estimatedVerificationTimeSec: tier === 1 ? '2-4' : tier === 2 ? '4-7' : '6-9',
      });
    } catch (err) {
      res.status(500).json({ error: 'Device profiling failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
