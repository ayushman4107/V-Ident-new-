import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface SignalCardProps {
  signal: string;
  score: number;
  weight: number;
  available: boolean;
  index: number;
}

const signalConfig: Record<string, { label: string; icon: string; iconSet: 'ion' | 'mci'; description: string }> = {
  vff: { label: 'Visual Frequency Forensics', icon: 'scan-outline', iconSet: 'ion', description: 'Detects deepfake artifacts in frequency domain' },
  crt: { label: 'Cognitive Response Timing', icon: 'timer-outline', iconSet: 'ion', description: 'Analyzes reaction latency and jitter patterns' },
  ha: { label: 'Hardware Attestation', icon: 'shield-checkmark-outline', iconSet: 'ion', description: 'Verifies genuine device hardware' },
  microTremor: { label: 'Micro-tremor IMU', icon: 'hand-wave', iconSet: 'mci', description: 'Detects natural hand tremor (8-12 Hz)' },
  rppg: { label: 'rPPG Heartbeat', icon: 'heart-outline', iconSet: 'ion', description: 'Remote pulse detection via camera' },
  touchPressure: { label: 'Touch Pressure', icon: 'finger-print-outline', iconSet: 'ion', description: 'Behavioral touch force signature' },
  microSaccade: { label: 'Micro-saccade Eye', icon: 'eye-outline', iconSet: 'ion', description: 'Sub-millisecond eye movement tracking' },
};

export default function SignalCard({ signal, score, weight, available, index }: SignalCardProps) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const config = signalConfig[signal] || { label: signal, icon: 'help-circle-outline', iconSet: 'ion' as const, description: '' };

  const scoreColor = !available ? Colors.textDim : score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.danger;
  const barWidth = available ? Math.max(5, score) : 0;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {config.iconSet === 'mci' ? (
            <MaterialCommunityIcons name={config.icon as any} size={20} color={available ? Colors.primaryCyan : Colors.textDim} />
          ) : (
            <Ionicons name={config.icon as any} size={20} color={available ? Colors.primaryCyan : Colors.textDim} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.label, !available && styles.unavailable]}>{config.label}</Text>
          <Text style={styles.description}>{config.description}</Text>
        </View>
        <View style={styles.scoreContainer}>
          {available ? (
            <Text style={[styles.scoreText, { color: scoreColor }]}>{score}%</Text>
          ) : (
            <Text style={styles.naText}>N/A</Text>
          )}
        </View>
      </View>
      {available && (
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: scoreColor }]} />
        </View>
      )}
      {available && (
        <Text style={styles.weight}>Weight: {(weight * 100).toFixed(0)}%</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primaryCyan}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  unavailable: {
    color: Colors.textDim,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  naText: {
    color: Colors.textDim,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  barBackground: {
    height: 4,
    backgroundColor: `${Colors.textDim}30`,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  weight: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
});
