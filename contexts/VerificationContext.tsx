import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  userId: string;
  deviceTier: number;
  accessibilityProfile: string;
  recoveryKey: string;
  enrolledAt: string;
}

export interface VerificationResult {
  verificationId: string;
  trustScore: number;
  zone: 'green' | 'amber' | 'red';
  explanation: string;
  flagReasons: string[];
  signalBreakdown: {
    signal: string;
    score: number;
    weight: number;
    available: boolean;
  }[];
  processingTimeMs: number;
  riskLevel: number;
  deviceTier: number;
  signals: any;
  reviewStatus?: string;
  videoMeetingLink?: string;
  videoMeetingTime?: string;
}

interface VerificationContextValue {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  lastVerification: VerificationResult | null;
  setLastVerification: (result: VerificationResult | null) => void;
  verificationHistory: VerificationResult[];
  addToHistory: (result: VerificationResult) => void;
  isEnrolled: boolean;
  clearAll: () => void;
  loadFromStorage: () => Promise<void>;
}

const VerificationContext = createContext<VerificationContextValue | null>(null);

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [lastVerification, setLastVerificationState] = useState<VerificationResult | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);

  const setUser = useCallback(async (u: UserProfile | null) => {
    setUserState(u);
    if (u) {
      await AsyncStorage.setItem('vident_user', JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem('vident_user');
    }
  }, []);

  const setLastVerification = useCallback(async (result: VerificationResult | null) => {
    setLastVerificationState(result);
    if (result) {
      await AsyncStorage.setItem('vident_last_verification', JSON.stringify(result));
    }
  }, []);

  const addToHistory = useCallback(async (result: VerificationResult) => {
    setVerificationHistory(prev => {
      const updated = [result, ...prev].slice(0, 50);
      AsyncStorage.setItem('vident_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setUserState(null);
    setLastVerificationState(null);
    setVerificationHistory([]);
    await AsyncStorage.multiRemove(['vident_user', 'vident_last_verification', 'vident_history']);
  }, []);

  const loadFromStorage = useCallback(async () => {
    try {
      const [userStr, lastStr, histStr] = await AsyncStorage.multiGet([
        'vident_user',
        'vident_last_verification',
        'vident_history',
      ]);
      if (userStr[1]) setUserState(JSON.parse(userStr[1]));
      if (lastStr[1]) setLastVerificationState(JSON.parse(lastStr[1]));
      if (histStr[1]) setVerificationHistory(JSON.parse(histStr[1]));
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    lastVerification,
    setLastVerification,
    verificationHistory,
    addToHistory,
    isEnrolled: !!user,
    clearAll,
    loadFromStorage,
  }), [user, lastVerification, verificationHistory, setUser, setLastVerification, addToHistory, clearAll, loadFromStorage]);

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
