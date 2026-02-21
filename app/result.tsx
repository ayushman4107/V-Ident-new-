import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import SignalCard from '@/components/SignalCard';
import GradientButton from '@/components/GradientButton';

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data: string }>();
  const data = params.data ? JSON.parse(params.data) : null;

  const contentOpacity = useSharedValue(0);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!data) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.errorText}>No verification data available</Text>
        <GradientButton title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const zoneConfig = {
    green: {
      color: Colors.success,
      bg: `${Colors.success}15`,
      title: 'Identity Verified',
      subtitle: 'All signals passed. Auto-approved.',
      icon: 'checkmark-circle' as const,
    },
    amber: {
      color: Colors.warning,
      bg: `${Colors.warning}15`,
      title: 'Additional Review Needed',
      subtitle: 'Some signals need a closer look.',
      icon: 'alert-circle' as const,
    },
    red: {
      color: Colors.danger,
      bg: `${Colors.danger}15`,
      title: 'Verification Flagged',
      subtitle: 'Human reviewer will check within 4 hours.',
      icon: 'close-circle' as const,
    },
  };

  const config = zoneConfig[data.zone as keyof typeof zoneConfig];

  return (
    <View style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Result</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={contentStyle}>
          <View style={styles.gaugeContainer}>
            <TrustScoreGauge score={data.trustScore} zone={data.zone} />
          </View>

          <View style={[styles.zoneCard, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={28} color={config.color} />
            <View style={styles.zoneInfo}>
              <Text style={[styles.zoneTitle, { color: config.color }]}>{config.title}</Text>
              <Text style={styles.zoneSubtitle}>{config.subtitle}</Text>
            </View>
          </View>

          <View style={styles.explanationCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.explanationText}>{data.explanation}</Text>
          </View>

          {data.flagReasons && data.flagReasons.length > 0 && (
            <View style={styles.flagsCard}>
              <Text style={styles.flagsTitle}>Flagged Concerns</Text>
              {data.flagReasons.map((reason: string, i: number) => (
                <View key={i} style={styles.flagRow}>
                  <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                  <Text style={styles.flagText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Risk Level</Text>
              <Text style={styles.metaValue}>R{data.riskLevel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Device Tier</Text>
              <Text style={styles.metaValue}>T{data.deviceTier}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Time</Text>
              <Text style={styles.metaValue}>{(data.processingTimeMs / 1000).toFixed(1)}s</Text>
            </View>
          </View>

          <View style={styles.signalsSection}>
            <Text style={styles.sectionTitle}>Signal Analysis</Text>
            <View style={styles.signalList}>
              {data.signalBreakdown?.map((signal: any, index: number) => (
                <SignalCard
                  key={signal.signal}
                  signal={signal.signal}
                  score={signal.score}
                  weight={signal.weight}
                  available={signal.available}
                  index={index}
                />
              ))}
            </View>
          </View>

          {(data.zone === 'amber' || data.zone === 'red') && (
            <View style={styles.actionSection}>
              <GradientButton
                title="View Review Status"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: '/review-status',
                    params: { verificationId: data.verificationId },
                  });
                }}
                icon={<Ionicons name="document-text" size={20} color="#fff" />}
              />
            </View>
          )}

          <View style={styles.actionSection}>
            <GradientButton
              title="Back to Dashboard"
              onPress={() => router.replace('/dashboard')}
              variant="secondary"
              icon={<Ionicons name="grid" size={20} color={Colors.textSecondary} />}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  scrollContent: {
    paddingBottom: 32,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
  },
  zoneInfo: {
    flex: 1,
    gap: 4,
  },
  zoneTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  zoneSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  explanationText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  flagsCard: {
    backgroundColor: `${Colors.warning}08`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.warning}20`,
  },
  flagsTitle: {
    color: Colors.warning,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  flagText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  metaLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  metaValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  signalsSection: {
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  signalList: {
    gap: 10,
  },
  actionSection: {
    marginBottom: 12,
  },
});
