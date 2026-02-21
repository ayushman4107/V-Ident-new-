import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useVerification } from '@/contexts/VerificationContext';
import GradientButton from '@/components/GradientButton';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isEnrolled, loadFromStorage } = useVerification();

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0.3);

  useEffect(() => {
    loadFromStorage();
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    buttonsOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isEnrolled) {
      router.push('/dashboard');
    } else {
      router.push('/enrollment');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      <Animated.View style={[styles.glowOrb, glowStyle]} />
      <Animated.View style={[styles.glowOrb2, glowStyle]} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimStyle]}>
          <Image
            source={require('../assets/images/vident-logo.jpeg')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View style={titleAnimStyle}>
          <Text style={styles.title}>V-Ident</Text>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleUnderline}
          />
        </Animated.View>

        <Animated.View style={[styles.subtitleContainer, subtitleAnimStyle]}>
          <Text style={styles.subtitle}>Real-Time Identity Verification</Text>
          <Text style={styles.description}>
            Tier-Adaptive, Risk-Calibrated, Accessibility-First verification powered by psychophysiological signal fusion
          </Text>
        </Animated.View>

        <Animated.View style={[styles.features, subtitleAnimStyle]}>
          <FeatureItem icon="shield-checkmark" text="Privacy-First ZK Proofs" />
          <FeatureItem icon="hardware-chip" text="On-Device ML Processing" />
          <FeatureItem icon="accessibility" text="Accessibility-First Design" />
          <FeatureItem icon="flash" text="Sub-4 Second Verification" />
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonArea, buttonsAnimStyle]}>
        <GradientButton
          title={isEnrolled ? "Go to Dashboard" : "Get Started"}
          onPress={handleGetStarted}
          icon={<Ionicons name={isEnrolled ? "grid" : "arrow-forward"} size={20} color="#fff" />}
        />
        <Text style={styles.footerText}>
          Team PsychoBytes | IIIT Pune
        </Text>
      </Animated.View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={fiStyles.row}>
      <View style={fiStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color={Colors.primaryCyan} />
      </View>
      <Text style={fiStyles.text}>{text}</Text>
    </View>
  );
}

const fiStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primaryCyan}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  glowOrb: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryCyan,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primaryFuchsia,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.borderMedium,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
  },
  titleUnderline: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  subtitleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  features: {
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  buttonArea: {
    paddingBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textDim,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
