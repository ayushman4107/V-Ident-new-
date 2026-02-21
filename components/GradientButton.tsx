import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  icon,
}: GradientButtonProps) {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const gradientColors = variant === 'danger'
    ? [Colors.danger, Colors.dangerDark] as const
    : variant === 'secondary'
    ? [Colors.backgroundCard, Colors.surface] as const
    : [Colors.gradientStart, Colors.gradientEnd] as const;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.wrapper,
        style,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 60,
    gap: 10,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  secondaryText: {
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
