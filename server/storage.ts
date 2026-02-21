import { randomUUID } from "crypto";

export interface EnrolledUser {
  id: string;
  deviceTier: number;
  accessibilityProfile: string;
  enrolledAt: string;
  recoveryKeyHash: string;
  templateHash: string;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  trustScore: number;
  zone: 'green' | 'amber' | 'red';
  riskLevel: number;
  signalBreakdown: any;
  explanation: string;
  flagReasons: string[];
  createdAt: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'video_scheduled';
  reviewNote?: string;
  videoMeetingLink?: string;
  videoMeetingTime?: string;
}

export interface ReviewCase {
  id: string;
  verificationId: string;
  userId: string;
  trustScore: number;
  zone: string;
  signalBreakdown: any;
  explanation: string;
  flagReasons: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'video_scheduled';
  assignedOfficer?: string;
  officerNotes?: string;
  videoMeetingLink?: string;
  videoMeetingTime?: string;
  createdAt: string;
  resolvedAt?: string;
}

class MemStorage {
  private enrolledUsers: Map<string, EnrolledUser> = new Map();
  private verifications: Map<string, VerificationRecord> = new Map();
  private reviewCases: Map<string, ReviewCase> = new Map();

  async enrollUser(data: Omit<EnrolledUser, 'id' | 'enrolledAt'>): Promise<EnrolledUser> {
    const id = randomUUID();
    const user: EnrolledUser = {
      ...data,
      id,
      enrolledAt: new Date().toISOString(),
    };
    this.enrolledUsers.set(id, user);
    return user;
  }

  async getEnrolledUser(id: string): Promise<EnrolledUser | undefined> {
    return this.enrolledUsers.get(id);
  }

  async createVerification(data: Omit<VerificationRecord, 'id' | 'createdAt'>): Promise<VerificationRecord> {
    const id = randomUUID();
    const record: VerificationRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.verifications.set(id, record);
    return record;
  }

  async getVerification(id: string): Promise<VerificationRecord | undefined> {
    return this.verifications.get(id);
  }

  async getUserVerifications(userId: string): Promise<VerificationRecord[]> {
    return Array.from(this.verifications.values())
      .filter(v => v.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createReviewCase(data: Omit<ReviewCase, 'id' | 'createdAt'>): Promise<ReviewCase> {
    const id = randomUUID();
    const reviewCase: ReviewCase = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.reviewCases.set(id, reviewCase);
    return reviewCase;
  }

  async getReviewCase(id: string): Promise<ReviewCase | undefined> {
    return this.reviewCases.get(id);
  }

  async getReviewCaseByVerification(verificationId: string): Promise<ReviewCase | undefined> {
    return Array.from(this.reviewCases.values()).find(r => r.verificationId === verificationId);
  }

  async updateReviewCase(id: string, updates: Partial<ReviewCase>): Promise<ReviewCase | undefined> {
    const existing = this.reviewCases.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.reviewCases.set(id, updated);

    if (updates.status === 'video_scheduled' && existing.verificationId) {
      const verification = this.verifications.get(existing.verificationId);
      if (verification) {
        verification.reviewStatus = 'video_scheduled';
        verification.videoMeetingLink = updates.videoMeetingLink;
        verification.videoMeetingTime = updates.videoMeetingTime;
        this.verifications.set(existing.verificationId, verification);
      }
    }

    return updated;
  }

  async getPendingReviews(): Promise<ReviewCase[]> {
    return Array.from(this.reviewCases.values())
      .filter(r => r.status === 'pending' || r.status === 'in_review')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

export const storage = new MemStorage();
