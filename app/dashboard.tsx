import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVerification } from '@/contexts/VerificationContext';
import GradientButton from '@/components/GradientButton';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, lastVerification, verificationHistory, clearAll } = useVerification();

  const headerOpacity = useSharedValue(0);
  const cardsOpacity = useSharedValue(0);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
    cardsOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const cardsStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value }));

  const tierLabels: Record<number, string> = {
    1: 'Budget (T1)',
    2: 'Mid-Range (T2)',
    3: 'Premium (T3)',
  };

  const handleVerify = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/verification');
  };

  const handleLogout = () => {
    clearAll();
    router.replace('/');
  };

  if (!user) {
    router.replace('/');
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userId}>ID: {user.userId.slice(0, 8)}...</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View style={cardsStyle}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="shield-checkmark" size={32} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Start Verification</Text>
              <Text style={styles.heroSubtitle}>
                Verify your identity for secure transactions
              </Text>
              <Pressable
                onPress={handleVerify}
                style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.heroButtonText}>Verify Now</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.background} />
              </Pressable>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="hardware-chip-outline" size={24} color={Colors.primaryCyan} />
              <Text style={styles.statValue}>{tierLabels[user.deviceTier] || 'T2'}</Text>
              <Text style={styles.statLabel}>Device Tier</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="accessibility-outline" size={24} color={Colors.primaryFuchsia} />
              <Text style={styles.statValue}>{user.accessibilityProfile}</Text>
              <Text style={styles.statLabel}>Profile</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="analytics-outline" size={24} color={Colors.success} />
              <Text style={styles.statValue}>{verificationHistory.length}</Text>
              <Text style={styles.statLabel}>Checks</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Signals</Text>
            <View style={styles.signalGrid}>
              <SignalBadge name="VFF" available icon="scan-outline" />
              <SignalBadge name="CRT" available icon="timer-outline" />
              <SignalBadge name="HA" available icon="shield-checkmark-outline" />
              <SignalBadge name="IMU" available={user.deviceTier >= 2} icon="hand-left-outline" />
              <SignalBadge name="rPPG" available={user.deviceTier >= 2} icon="heart-outline" />
              <SignalBadge name="Touch" available icon="finger-print-outline" />
              <SignalBadge name="Saccade" available={user.deviceTier >= 3} icon="eye-outline" />
            </View>
          </View>

          {lastVerification && (
            <Pressable
              style={styles.lastVerificationCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/result',
                  params: { data: JSON.stringify(lastVerification) },
                });
              }}
            >
              <View style={styles.lvHeader}>
                <Text style={styles.sectionTitle}>Last Verification</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
              <View style={styles.lvContent}>
                <View style={[
                  styles.zoneBadge,
                  { backgroundColor: lastVerification.zone === 'green' ? `${Colors.success}20` : lastVerification.zone === 'amber' ? `${Colors.warning}20` : `${Colors.danger}20` }
                ]}>
                  <Ionicons
                    name={lastVerification.zone === 'green' ? 'checkmark-circle' : lastVerification.zone === 'amber' ? 'alert-circle' : 'close-circle'}
                    size={20}
                    color={lastVerification.zone === 'green' ? Colors.success : lastVerification.zone === 'amber' ? Colors.warning : Colors.danger}
                  />
                  <Text style={[
                    styles.zoneText,
                    { color: lastVerification.zone === 'green' ? Colors.success : lastVerification.zone === 'amber' ? Colors.warning : Colors.danger }
                  ]}>
                    {lastVerification.zone.toUpperCase()} ZONE
                  </Text>
                </View>
                <Text style={styles.lvScore}>Score: {lastVerification.trustScore}</Text>
              </View>
              {(lastVerification.zone === 'amber' || lastVerification.zone === 'red') && (
                <Pressable
                  onPress={() => router.push({ pathname: '/review-status', params: { verificationId: lastVerification.verificationId } })}
                  style={styles.reviewLink}
                >
                  <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.reviewLinkText}>View Review Status</Text>
                </Pressable>
              )}
            </Pressable>
          )}

          {verificationHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>History</Text>
              {verificationHistory.slice(0, 5).map((v, i) => (
                <Pressable
                  key={v.verificationId}
                  style={styles.historyItem}
                  onPress={() => {
                    router.push({ pathname: '/result', params: { data: JSON.stringify(v) } });
                  }}
                >
                  <Ionicons
                    name={v.zone === 'green' ? 'checkmark-circle' : v.zone === 'amber' ? 'alert-circle' : 'close-circle'}
                    size={20}
                    color={v.zone === 'green' ? Colors.success : v.zone === 'amber' ? Colors.warning : Colors.danger}
                  />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyScore}>Score: {v.trustScore}</Text>
                    <Text style={styles.historyMeta}>Risk Level R{v.riskLevel}</Text>
                  </View>
                  <Text style={styles.historyZone}>{v.zone.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SignalBadge({ name, available, icon }: { name: string; available: boolean; icon: string }) {
  return (
    <View style={[sbStyles.badge, !available && sbStyles.badgeDisabled]}>
      <Ionicons name={icon as any} size={16} color={available ? Colors.primaryCyan : Colors.textDim} />
      <Text style={[sbStyles.text, !available && sbStyles.textDisabled]}>{name}</Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${Colors.primaryCyan}10`,
    borderWidth: 1,
    borderColor: `${Colors.primaryCyan}30`,
  },
  badgeDisabled: {
    backgroundColor: `${Colors.textDim}10`,
    borderColor: `${Colors.textDim}20`,
  },
  text: {
    color: Colors.primaryCyan,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  textDisabled: {
    color: Colors.textDim,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  userId: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroContent: {
    padding: 24,
    gap: 12,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  heroButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  section: {
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lastVerificationCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    gap: 12,
  },
  lvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lvContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zoneText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  lvScore: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  reviewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  reviewLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyScore: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  historyMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  historyZone: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
