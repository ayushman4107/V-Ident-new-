import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface TrustScoreGaugeProps {
  score: number;
  zone: 'green' | 'amber' | 'red';
  size?: number;
}

export default function TrustScoreGauge({ score, zone, size = 200 }: TrustScoreGaugeProps) {
  const animatedScore = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    animatedScore.value = withDelay(300, withTiming(score, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [score]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const zoneConfig = {
    green: { color: Colors.success, label: 'VERIFIED', icon: 'checkmark-circle' as const },
    amber: { color: Colors.warning, label: 'REVIEW NEEDED', icon: 'alert-circle' as const },
    red: { color: Colors.danger, label: 'FLAGGED', icon: 'close-circle' as const },
  };

  const config = zoneConfig[zone];

  return (
    <Animated.View style={[styles.container, containerStyle, { width: size, height: size }]}>
      <View style={[styles.outerRing, { width: size, height: size, borderColor: config.color }]}>
        <View style={[styles.innerRing, { width: size - 24, height: size - 24, borderColor: `${config.color}40` }]}>
          <View style={[styles.core, { width: size - 48, height: size - 48 }]}>
            <Ionicons name={config.icon} size={32} color={config.color} />
            <Text style={[styles.score, { color: config.color }]}>{Math.round(score)}</Text>
            <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    borderRadius: 999,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  score: {
    fontSize: 44,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
  },
});
