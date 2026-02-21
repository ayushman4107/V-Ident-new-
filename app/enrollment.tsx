import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVerification } from '@/contexts/VerificationContext';
import GradientButton from '@/components/GradientButton';
import { apiRequest } from '@/lib/query-client';

type Step = 'welcome' | 'accessibility' | 'camera' | 'capture' | 'processing' | 'recovery' | 'complete';

const ACCESSIBILITY_PROFILES = [
  { id: 'standard', label: 'Standard', icon: 'person-outline', description: 'Full TASS matrix as per device tier' },
  { id: 'motor', label: 'Motor Disability', icon: 'accessibility-outline', description: 'Voice-based alternatives replace gesture components' },
  { id: 'visual', label: 'Visual Impairment', icon: 'eye-off-outline', description: 'Audio-guided challenges, no gaze-based tests' },
  { id: 'neurological', label: 'Neurological', icon: 'pulse-outline', description: 'Extended time windows, personalized baselines' },
  { id: 'elderly', label: 'Elderly User', icon: 'heart-outline', description: 'Extended windows, larger targets, voice option' },
];

export default function EnrollmentScreen() {
  const insets = useSafeAreaInsets();
  const { setUser } = useVerification();
  const [step, setStep] = useState<Step>('welcome');
  const [accessibilityProfile, setAccessibilityProfile] = useState('standard');
  const [deviceTier, setDeviceTier] = useState(2);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [loading, setLoading] = useState(false);
  const captureTimer = useRef<ReturnType<typeof setInterval>>();

  const pulseAnim = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (step === 'capture' && isCapturing) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(0.95, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [step, isCapturing]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const startCapture = () => {
    setIsCapturing(true);
    setCaptureProgress(0);
    let progress = 0;
    captureTimer.current = setInterval(() => {
      progress += 100 / 120;
      setCaptureProgress(Math.min(100, progress));
      if (progress >= 100) {
        clearInterval(captureTimer.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('processing');
        handleEnroll();
      }
    }, 100);
  };

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/enroll', {
        deviceTier,
        accessibilityProfile,
      });
      const data = await res.json();
      setRecoveryKey(data.recoveryKey);

      await setUser({
        userId: data.userId,
        deviceTier: data.deviceTier,
        accessibilityProfile: data.accessibilityProfile,
        recoveryKey: data.recoveryKey,
        enrolledAt: data.enrolledAt,
      });

      setTimeout(() => {
        setStep('recovery');
        setLoading(false);
      }, 2000);
    } catch (err) {
      console.error('Enrollment failed:', err);
      setLoading(false);
      Alert.alert('Enrollment Failed', 'Please check your connection and try again.');
      setStep('camera');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.stepIconGradient}>
                <Ionicons name="person-add" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>Enrollment</Text>
            <Text style={styles.stepDescription}>
              We will set up your identity profile in a few simple steps. Your biometric data never leaves your device.
            </Text>
            <View style={styles.stepList}>
              <StepIndicator num="1" text="Choose accessibility profile" active />
              <StepIndicator num="2" text="Camera verification" />
              <StepIndicator num="3" text="Secure your recovery key" />
            </View>
            <GradientButton title="Begin Enrollment" onPress={() => setStep('accessibility')} icon={<Ionicons name="arrow-forward" size={20} color="#fff" />} />
          </View>
        );

      case 'accessibility':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Accessibility Profile</Text>
            <Text style={styles.stepDescription}>
              Choose the profile that best matches your needs. This ensures fair and accurate verification for everyone.
            </Text>
            <ScrollView style={styles.profileList} showsVerticalScrollIndicator={false}>
              {ACCESSIBILITY_PROFILES.map(profile => (
                <Pressable
                  key={profile.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAccessibilityProfile(profile.id);
                  }}
                  style={[
                    styles.profileCard,
                    accessibilityProfile === profile.id && styles.profileCardActive,
                  ]}
                >
                  <View style={styles.profileIconWrap}>
                    <Ionicons name={profile.icon as any} size={24} color={accessibilityProfile === profile.id ? Colors.primaryCyan : Colors.textMuted} />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={[styles.profileLabel, accessibilityProfile === profile.id && styles.profileLabelActive]}>
                      {profile.label}
                    </Text>
                    <Text style={styles.profileDesc}>{profile.description}</Text>
                  </View>
                  {accessibilityProfile === profile.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primaryCyan} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <GradientButton title="Continue" onPress={() => setStep('camera')} icon={<Ionicons name="arrow-forward" size={20} color="#fff" />} />
          </View>
        );

      case 'camera':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.stepIconGradient}>
                <Ionicons name="camera" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>Camera Verification</Text>
            <Text style={styles.stepDescription}>
              We need access to your front camera for a 12-second guided capture. No images are transmitted or stored on any server.
            </Text>
            {!permission?.granted ? (
              <GradientButton
                title="Allow Camera Access"
                onPress={async () => {
                  const result = await requestPermission();
                  if (result.granted) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setStep('capture');
                  }
                }}
                icon={<Ionicons name="camera" size={20} color="#fff" />}
              />
            ) : (
              <GradientButton
                title="Start Capture"
                onPress={() => setStep('capture')}
                icon={<Ionicons name="videocam" size={20} color="#fff" />}
              />
            )}
            {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' && (
              <Text style={styles.permissionNote}>
                Camera access was denied. Please enable it in your device Settings.
              </Text>
            )}
          </View>
        );

      case 'capture':
        return (
          <View style={styles.captureContainer}>
            <View style={styles.cameraWrapper}>
              {permission?.granted && Platform.OS !== 'web' ? (
                <CameraView style={styles.camera} facing="front" />
              ) : (
                <View style={[styles.camera, styles.cameraPlaceholder]}>
                  <Ionicons name="person" size={80} color={Colors.textDim} />
                  <Text style={styles.cameraPlaceholderText}>Camera Preview</Text>
                </View>
              )}
              <Animated.View style={[styles.faceOval, pulseStyle]}>
                <View style={styles.faceOvalInner} />
              </Animated.View>
            </View>
            <View style={styles.captureInfo}>
              <Text style={styles.captureInstruction}>
                {isCapturing
                  ? 'Keep your face in the oval and follow the light'
                  : 'Position your face within the oval frame'}
              </Text>
              {isCapturing && (
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${captureProgress}%` }]}
                  />
                </View>
              )}
              {isCapturing && (
                <Text style={styles.captureTimer}>{Math.ceil(12 - (captureProgress / 100) * 12)}s remaining</Text>
              )}
              {!isCapturing && (
                <GradientButton
                  title="Start 12-Second Capture"
                  onPress={startCapture}
                  icon={<Ionicons name="radio-button-on" size={20} color="#fff" />}
                />
              )}
            </View>
          </View>
        );

      case 'processing':
        return (
          <View style={styles.stepContent}>
            <View style={styles.processingContainer}>
              <Animated.View style={pulseStyle}>
                <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.processingIcon}>
                  <Ionicons name="cog" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.stepTitle}>Processing</Text>
              <Text style={styles.stepDescription}>
                Extracting feature vectors and generating your secure identity template. All processing happens on-device.
              </Text>
              <View style={styles.processingSteps}>
                <ProcessingStep label="Device profiling" done />
                <ProcessingStep label="Feature extraction" done={loading} />
                <ProcessingStep label="Template encryption" done={false} />
                <ProcessingStep label="Recovery key generation" done={false} />
              </View>
            </View>
          </View>
        );

      case 'recovery':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <LinearGradient colors={[Colors.warning, Colors.warningDark]} style={styles.stepIconGradient}>
                <Ionicons name="key" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>Recovery Key</Text>
            <Text style={[styles.stepDescription, { color: Colors.warning }]}>
              Save this key securely. It is shown only once and is needed to recover your identity on a new device.
            </Text>
            <View style={styles.recoveryKeyBox}>
              <Text style={styles.recoveryKeyText}>{recoveryKey}</Text>
            </View>
            <Text style={styles.recoveryNote}>
              Write this down or save it in a secure password manager. V-Ident cannot recover this key for you.
            </Text>
            <GradientButton
              title="I Have Saved My Key"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setStep('complete');
              }}
              icon={<Ionicons name="checkmark" size={20} color="#fff" />}
            />
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIconWrap}>
              <LinearGradient colors={[Colors.success, Colors.successDark]} style={styles.stepIconGradient}>
                <Ionicons name="checkmark-done" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>Enrollment Complete</Text>
            <Text style={styles.stepDescription}>
              Your identity profile has been securely created. You can now verify your identity for any transaction.
            </Text>
            <View style={styles.completeSummary}>
              <SummaryRow label="Device Tier" value={`T${deviceTier}`} />
              <SummaryRow label="Accessibility" value={accessibilityProfile} />
              <SummaryRow label="Credential" value="W3C Verifiable" />
            </View>
            <GradientButton
              title="Go to Dashboard"
              onPress={() => router.replace('/dashboard')}
              icon={<Ionicons name="grid" size={20} color="#fff" />}
            />
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => {
          if (captureTimer.current) clearInterval(captureTimer.current);
          router.back();
        }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.progressDots}>
          {(['welcome', 'accessibility', 'camera', 'capture', 'processing', 'recovery', 'complete'] as Step[]).map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                (['welcome', 'accessibility', 'camera', 'capture', 'processing', 'recovery', 'complete'] as Step[]).indexOf(step) > i && styles.dotDone,
              ]}
            />
          ))}
        </View>
      </View>
      {renderStep()}
    </View>
  );
}

function StepIndicator({ num, text, active }: { num: string; text: string; active?: boolean }) {
  return (
    <View style={siStyles.row}>
      <View style={[siStyles.num, active && siStyles.numActive]}>
        <Text style={[siStyles.numText, active && siStyles.numTextActive]}>{num}</Text>
      </View>
      <Text style={[siStyles.text, active && siStyles.textActive]}>{text}</Text>
    </View>
  );
}

const siStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.backgroundCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  numActive: { backgroundColor: `${Colors.primaryCyan}20`, borderColor: Colors.primaryCyan },
  numText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  numTextActive: { color: Colors.primaryCyan },
  text: { color: Colors.textMuted, fontSize: 15, fontFamily: 'Inter_500Medium' },
  textActive: { color: Colors.textPrimary },
});

function ProcessingStep({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={psStyles.row}>
      <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={20} color={done ? Colors.success : Colors.textDim} />
      <Text style={[psStyles.text, done && psStyles.textDone]}>{label}</Text>
    </View>
  );
}

const psStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: Colors.textDim, fontSize: 15, fontFamily: 'Inter_500Medium' },
  textDone: { color: Colors.textPrimary },
});

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={srStyles.row}>
      <Text style={srStyles.label}>{label}</Text>
      <Text style={srStyles.value}>{value}</Text>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_500Medium' },
  value: { color: Colors.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textDim,
  },
  dotActive: {
    backgroundColor: Colors.primaryCyan,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.success,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  stepIconWrap: {
    marginBottom: 8,
  },
  stepIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  stepList: {
    gap: 16,
    alignSelf: 'stretch',
    paddingVertical: 16,
  },
  profileList: {
    alignSelf: 'stretch',
    maxHeight: 340,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    gap: 12,
  },
  profileCardActive: {
    borderColor: Colors.primaryCyan,
    backgroundColor: `${Colors.primaryCyan}10`,
  },
  profileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primaryCyan}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  profileLabelActive: {
    color: Colors.primaryCyan,
  },
  profileDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  captureContainer: {
    flex: 1,
    gap: 24,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 24,
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
  cameraPlaceholderText: {
    color: Colors.textDim,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  faceOval: {
    position: 'absolute',
    top: '15%',
    left: '20%',
    right: '20%',
    bottom: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOvalInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.primaryCyan,
    borderStyle: 'dashed',
  },
  captureInfo: {
    gap: 16,
    alignItems: 'center',
    paddingBottom: 16,
  },
  captureInstruction: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  captureTimer: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  processingIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingSteps: {
    gap: 14,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
  },
  recoveryKeyBox: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.warning,
    alignSelf: 'stretch',
  },
  recoveryKeyText: {
    color: Colors.warning,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  recoveryNote: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  completeSummary: {
    alignSelf: 'stretch',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  permissionNote: {
    color: Colors.warning,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
