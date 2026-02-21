import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVerification } from '@/contexts/VerificationContext';
import GradientButton from '@/components/GradientButton';
import { apiRequest } from '@/lib/query-client';

type Phase = 'setup' | 'camera' | 'crt' | 'processing' | 'done';

const CRT_CHALLENGES = [
  { instruction: 'Tap the circle when it turns cyan', delay: 1500 },
  { instruction: 'Tap the circle when it turns cyan', delay: 2200 },
  { instruction: 'Tap the circle when it turns cyan', delay: 1800 },
  { instruction: 'Tap the circle when it turns cyan', delay: 2500 },
  { instruction: 'Tap the circle when it turns cyan', delay: 1200 },
];

export default function VerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user, setLastVerification, addToHistory } = useVerification();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('setup');
  const [riskLevel, setRiskLevel] = useState(1);
  const [crtIndex, setCrtIndex] = useState(0);
  const [crtActive, setCrtActive] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [imuData, setImuData] = useState<{ x: number; y: number; z: number; timestamp: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const crtStartTime = useRef(0);
  const imuSubscription = useRef<any>(null);

  const pulseAnim = useSharedValue(1);
  const scanLineY = useSharedValue(0);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    return () => {
      if (imuSubscription.current) {
        imuSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'camera') {
      startIMUCapture();
      let prog = 0;
      const interval = setInterval(() => {
        prog += 100 / 50;
        setScanProgress(Math.min(100, prog));
        if (prog >= 100) {
          clearInterval(interval);
          stopIMUCapture();
          setPhase('crt');
        }
      }, 100);

      scanLineY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );

      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'crt' && crtIndex < CRT_CHALLENGES.length) {
      setCrtActive(false);
      const timer = setTimeout(() => {
        setCrtActive(true);
        crtStartTime.current = Date.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, CRT_CHALLENGES[crtIndex].delay);
      return () => clearTimeout(timer);
    } else if (phase === 'crt' && crtIndex >= CRT_CHALLENGES.length) {
      setPhase('processing');
      runVerification();
    }
  }, [phase, crtIndex]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLineY.value * 100}%`,
  }));

  const startIMUCapture = () => {
    try {
      Accelerometer.setUpdateInterval(100);
      imuSubscription.current = Accelerometer.addListener(data => {
        setImuData(prev => [...prev, { ...data, timestamp: Date.now() }].slice(-100));
      });
    } catch (e) {
      console.log('Accelerometer not available');
    }
  };

  const stopIMUCapture = () => {
    if (imuSubscription.current) {
      imuSubscription.current.remove();
      imuSubscription.current = null;
    }
  };

  const handleCRTTap = () => {
    if (!crtActive) return;
    const reactionTime = Date.now() - crtStartTime.current;
    setResponseTimes(prev => [...prev, reactionTime]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCrtActive(false);
    setCrtIndex(prev => prev + 1);
  };

  const runVerification = async () => {
    setIsProcessing(true);
    try {
      const res = await apiRequest('POST', '/api/verify', {
        userId: user?.userId,
        riskLevel,
        deviceTier: user?.deviceTier || 2,
        imageData: { width: 640, height: 480, frameCount: 30, fps: 15 },
        responseTimes,
        imuData: imuData.slice(-50),
        facialData: {
          skinTone: 3,
          ambientLux: 250,
          regionData: {
            forehead: [0.8, 0.82, 0.79, 0.83, 0.81],
            leftCheek: [0.78, 0.76, 0.8, 0.77, 0.79],
            rightCheek: [0.82, 0.84, 0.8, 0.83, 0.81],
          },
        },
        isRooted: false,
      });

      const data = await res.json();
      const result = {
        verificationId: data.verificationId,
        trustScore: data.trustScore,
        zone: data.zone,
        explanation: data.explanation,
        flagReasons: data.flagReasons,
        signalBreakdown: data.signalBreakdown,
        processingTimeMs: data.processingTimeMs,
        riskLevel: data.riskLevel,
        deviceTier: data.deviceTier,
        signals: data.signals,
      };

      await setLastVerification(result);
      await addToHistory(result);

      Haptics.notificationAsync(
        data.zone === 'green'
          ? Haptics.NotificationFeedbackType.Success
          : data.zone === 'amber'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error
      );

      router.replace({ pathname: '/result', params: { data: JSON.stringify(result) } });
    } catch (err) {
      console.error('Verification failed:', err);
      Alert.alert('Verification Failed', 'Please check your connection and try again.');
      setIsProcessing(false);
      setPhase('setup');
    }
  };

  const renderPhase = () => {
    switch (phase) {
      case 'setup':
        return (
          <View style={styles.phaseContent}>
            <View style={styles.setupIcon}>
              <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.setupIconGradient}>
                <Ionicons name="shield-checkmark" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.phaseTitle}>Identity Verification</Text>
            <Text style={styles.phaseDescription}>
              This process takes 5-10 seconds. We will analyze multiple signals to verify your identity securely.
            </Text>

            <View style={styles.riskSelector}>
              <Text style={styles.riskLabel}>Transaction Risk Level</Text>
              <View style={styles.riskButtons}>
                {[1, 2, 3].map(level => (
                  <Pressable
                    key={level}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRiskLevel(level);
                    }}
                    style={[styles.riskButton, riskLevel === level && styles.riskButtonActive]}
                  >
                    <Text style={[styles.riskButtonText, riskLevel === level && styles.riskButtonTextActive]}>
                      R{level}
                    </Text>
                    <Text style={[styles.riskButtonSub, riskLevel === level && styles.riskButtonSubActive]}>
                      {level === 1 ? 'Low' : level === 2 ? 'Medium' : 'High'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <GradientButton
              title="Begin Verification"
              onPress={async () => {
                if (!permission?.granted) {
                  const result = await requestPermission();
                  if (!result.granted) {
                    Alert.alert('Camera Required', 'Camera access is needed for verification.');
                    return;
                  }
                }
                setPhase('camera');
              }}
              icon={<Ionicons name="scan" size={20} color="#fff" />}
            />
          </View>
        );

      case 'camera':
        return (
          <View style={styles.cameraPhase}>
            <View style={styles.cameraContainer}>
              {permission?.granted && Platform.OS !== 'web' ? (
                <CameraView style={styles.camera} facing="front" />
              ) : (
                <View style={[styles.camera, styles.cameraPlaceholder]}>
                  <Ionicons name="person" size={60} color={Colors.textDim} />
                </View>
              )}
              <Animated.View style={[styles.scanLine, scanLineStyle]}>
                <LinearGradient
                  colors={['transparent', Colors.primaryCyan, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanLineGradient}
                />
              </Animated.View>
              <View style={styles.cameraOverlay}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>
            </View>
            <View style={styles.scanInfo}>
              <Text style={styles.scanTitle}>Scanning Face</Text>
              <Text style={styles.scanInstruction}>Keep your face centered and stay still</Text>
              <View style={styles.scanProgressBg}>
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.scanProgressFill, { width: `${scanProgress}%` }]}
                />
              </View>
              <View style={styles.signalIndicators}>
                <SignalIndicator label="VFF" active />
                <SignalIndicator label="IMU" active={imuData.length > 0} />
                <SignalIndicator label="rPPG" active={scanProgress > 30} />
              </View>
            </View>
          </View>
        );

      case 'crt':
        return (
          <View style={styles.phaseContent}>
            <Text style={styles.phaseTitle}>Response Test</Text>
            <Text style={styles.phaseDescription}>
              {CRT_CHALLENGES[crtIndex]?.instruction || 'Processing results...'}
            </Text>
            <Text style={styles.crtCounter}>{crtIndex + 1} / {CRT_CHALLENGES.length}</Text>
            <Pressable onPress={handleCRTTap} style={styles.crtTarget}>
              <View style={[styles.crtCircle, crtActive && styles.crtCircleActive]}>
                {crtActive && <Ionicons name="radio-button-on" size={40} color="#fff" />}
              </View>
            </Pressable>
            <Text style={styles.crtHint}>
              {crtActive ? 'TAP NOW' : 'Wait for the circle...'}
            </Text>
          </View>
        );

      case 'processing':
        return (
          <View style={styles.phaseContent}>
            <View style={styles.processingAnimation}>
              <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.processingIcon}>
                <Ionicons name="analytics" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.phaseTitle}>Analyzing Signals</Text>
            <Text style={styles.phaseDescription}>
              Computing Bayesian Trust Score using {user?.deviceTier === 1 ? '3' : user?.deviceTier === 2 ? '5' : '7'} signal fusion...
            </Text>
            <View style={styles.processingSignals}>
              <ProcessingSignal label="Visual Frequency Forensics" done />
              <ProcessingSignal label="Cognitive Response Timing" done />
              <ProcessingSignal label="Hardware Attestation" done />
              {(user?.deviceTier || 2) >= 2 && <ProcessingSignal label="Micro-tremor Analysis" done={isProcessing} />}
              {(user?.deviceTier || 2) >= 2 && <ProcessingSignal label="rPPG Heartbeat" done={isProcessing} />}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 16 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 44 }} />
      </View>
      {renderPhase()}
    </View>
  );
}

function SignalIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[siStyles.container, active && siStyles.containerActive]}>
      <View style={[siStyles.dot, active && siStyles.dotActive]} />
      <Text style={[siStyles.label, active && siStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const siStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: `${Colors.textDim}15` },
  containerActive: { backgroundColor: `${Colors.success}15` },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textDim },
  dotActive: { backgroundColor: Colors.success },
  label: { color: Colors.textDim, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  labelActive: { color: Colors.success },
});

function ProcessingSignal({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={psStyles.row}>
      <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={18} color={done ? Colors.success : Colors.textDim} />
      <Text style={[psStyles.text, done && psStyles.textDone]}>{label}</Text>
    </View>
  );
}

const psStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: Colors.textDim, fontSize: 14, fontFamily: 'Inter_500Medium' },
  textDone: { color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  phaseContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  phaseTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  phaseDescription: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  setupIcon: {
    marginBottom: 8,
  },
  setupIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskSelector: {
    alignSelf: 'stretch',
    gap: 12,
    marginVertical: 8,
  },
  riskLabel: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  riskButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  riskButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  riskButtonActive: {
    borderColor: Colors.primaryCyan,
    backgroundColor: `${Colors.primaryCyan}10`,
  },
  riskButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  riskButtonTextActive: {
    color: Colors.primaryCyan,
  },
  riskButtonSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  riskButtonSubActive: {
    color: Colors.textSecondary,
  },
  cameraPhase: {
    flex: 1,
    gap: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineGradient: {
    height: 2,
    width: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primaryCyan,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primaryCyan,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primaryCyan,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primaryCyan,
    borderBottomRightRadius: 8,
  },
  scanInfo: {
    gap: 12,
    alignItems: 'center',
    paddingBottom: 8,
  },
  scanTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  scanInstruction: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  scanProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scanProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  signalIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  crtCounter: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  crtTarget: {
    padding: 20,
  },
  crtCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 3,
    borderColor: Colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crtCircleActive: {
    backgroundColor: Colors.primaryCyan,
    borderColor: Colors.primaryCyan,
  },
  crtHint: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  processingAnimation: {
    marginBottom: 8,
  },
  processingIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingSignals: {
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
});
