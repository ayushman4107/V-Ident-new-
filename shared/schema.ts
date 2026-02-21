import { z } from "zod";

export const enrollmentSchema = z.object({
  deviceTier: z.number().min(1).max(3),
  accessibilityProfile: z.string().optional().default('standard'),
});

export const verificationSchema = z.object({
  userId: z.string(),
  riskLevel: z.number().min(1).max(3).optional().default(1),
  deviceTier: z.number().min(1).max(3).optional().default(2),
  imageData: z.object({
    width: z.number(),
    height: z.number(),
    frameCount: z.number(),
    fps: z.number(),
  }).optional(),
  responseTimes: z.array(z.number()).optional(),
  imuData: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    timestamp: z.number(),
  })).optional(),
  facialData: z.object({
    skinTone: z.number(),
    ambientLux: z.number(),
    regionData: z.object({
      forehead: z.array(z.number()),
      leftCheek: z.array(z.number()),
      rightCheek: z.array(z.number()),
    }),
  }).optional(),
  isRooted: z.boolean().optional().default(false),
});

export const deviceProfileSchema = z.object({
  ramGB: z.number(),
  cameraMP: z.number(),
  hasTEE: z.boolean(),
  benchmarkScore: z.number(),
});

export const reviewResolveSchema = z.object({
  status: z.enum(['approved', 'rejected', 'video_scheduled']),
  officerNotes: z.string().optional(),
  videoMeetingLink: z.string().optional(),
  videoMeetingTime: z.string().optional(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type DeviceProfile = z.infer<typeof deviceProfileSchema>;
export type ReviewResolve = z.infer<typeof reviewResolveSchema>;
