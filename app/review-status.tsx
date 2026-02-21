import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVerification } from '@/contexts/VerificationContext';
import GradientButton from '@/components/GradientButton';
import { apiRequest } from '@/lib/query-client';

export default function ReviewStatusScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ verificationId: string }>();
  const { lastVerification } = useVerification();
  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const pulseAnim = useSharedValue(0.6);
  const contentOpacity = useSharedValue(0);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.6, { duration: 1500 })
      ),
      -1,
      true
    );
    fetchReviewStatus();
  }, []);

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));

  const fetchReviewStatus = async () => {
    try {
      if (params.verificationId) {
        const res = await apiRequest('GET', `/api/verification/${params.verificationId}`);
        const data = await res.json();
        setReviewData(data);
      }
    } catch (err) {
      console.error('Failed to fetch review:', err);
    } finally {
      setLoading(false);
    }
  };

  const simulateHumanReview = async () => {
    setSimulating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (reviewData?.review?.id) {
        const isAmber = reviewData.zone === 'amber';
        const meetingTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

        await apiRequest('POST', `/api/reviews/${reviewData.review.id}/resolve`, {
          status: isAmber ? 'video_scheduled' : 'approved',
          officerNotes: isAmber
            ? 'Trust score in amber zone. Video meeting scheduled to verify identity.'
            : 'Verification reviewed and approved by officer after manual signal analysis.',
          videoMeetingLink: isAmber ? 'https://meet.vident.app/verify-' + reviewData.review.id.slice(0, 8) : undefined,
          videoMeetingTime: isAmber ? meetingTime : undefined,
        });

        await fetchReviewStatus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      Alert.alert('Error', 'Failed to simulate review.');
    } finally {
      setSimulating(false);
    }
  };

  const zone = reviewData?.zone || lastVerification?.zone || 'amber';
  const explanation = reviewData?.explanation || lastVerification?.explanation || '';
  const flagReasons = reviewData?.flagReasons || lastVerification?.flagReasons || [];
  const review = reviewData?.review;

  const statusConfig: Record<string, { icon: string; color: string; label: string; description: string }> = {
    pending: {
      icon: 'time-outline',
      color: Colors.warning,
      label: 'Under Review',
      description: 'Your case is in the review queue. A verification officer will review it within 4 hours.',
    },
    in_review: {
      icon: 'person-outline',
      color: Colors.primaryCyan,
      label: 'Being Reviewed',
      description: 'An officer is currently reviewing your verification signals.',
    },
    approved: {
      icon: 'checkmark-circle',
      color: Colors.success,
      label: 'Approved',
      description: 'Your identity has been verified and approved by a human reviewer.',
    },
    rejected: {
      icon: 'close-circle',
      color: Colors.danger,
      label: 'Not Approved',
      description: 'The reviewer could not verify your identity. Please try again or visit your nearest branch.',
    },
    video_scheduled: {
      icon: 'videocam',
      color: Colors.primaryFuchsia,
      label: 'Video Meeting Scheduled',
      description: 'A video meeting has been arranged to complete your verification.',
    },
  };

  const status = review?.status || 'pending';
  const statusInfo = statusConfig[status] || statusConfig.pending;

  return (
    <View style={[styles.container, { paddingTop: topPadding + 16, paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Review Status</Text>
        <Pressable onPress={fetchReviewStatus} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={contentStyle}>
          <View style={styles.statusCard}>
            <Animated.View style={[styles.statusIconWrap, pulseStyle, { borderColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon as any} size={40} color={statusInfo.color} />
            </Animated.View>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          </View>

          {zone !== 'green' && (
            <View style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Ionicons name="information-circle" size={20} color={Colors.textSecondary} />
                <Text style={styles.explanationTitle}>Why was I flagged?</Text>
              </View>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}

          {flagReasons.length > 0 && (
            <View style={styles.reasonsCard}>
              <Text style={styles.reasonsTitle}>Detailed Reasons</Text>
              {flagReasons.map((reason: string, i: number) => (
                <View key={i} style={styles.reasonRow}>
                  <View style={styles.reasonDot} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {status === 'video_scheduled' && review?.videoMeetingLink && (
            <View style={styles.meetingCard}>
              <LinearGradient
                colors={[Colors.primaryFuchsia, Colors.primaryPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.meetingGradient}
              >
                <Ionicons name="videocam" size={28} color="#fff" />
                <View style={styles.meetingInfo}>
                  <Text style={styles.meetingTitle}>Video Meeting</Text>
                  <Text style={styles.meetingLink}>{review.videoMeetingLink}</Text>
                  {review.videoMeetingTime && (
                    <Text style={styles.meetingTime}>
                      Scheduled: {new Date(review.videoMeetingTime).toLocaleString()}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {review?.officerNotes && (
            <View style={styles.notesCard}>
              <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.notesContent}>
                <Text style={styles.notesTitle}>Officer Notes</Text>
                <Text style={styles.notesText}>{review.officerNotes}</Text>
                {review.assignedOfficer && (
                  <Text style={styles.officerInfo}>Reviewed by: {review.assignedOfficer}</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Review Timeline</Text>
            <View style={styles.timeline}>
              <TimelineItem label="Verification submitted" time="Just now" done />
              <TimelineItem label="Queued for review" time="~1 min" done={status !== 'pending'} />
              <TimelineItem label="Officer assigned" time="~15 min" done={status === 'in_review' || status === 'approved' || status === 'video_scheduled'} />
              <TimelineItem
                label={zone === 'amber' ? 'Video meeting scheduled' : 'Decision made'}
                time="Within 4 hours"
                done={status === 'approved' || status === 'rejected' || status === 'video_scheduled'}
              />
            </View>
          </View>

          {(status === 'pending' || status === 'in_review') && (
            <View style={styles.simulateSection}>
              <Text style={styles.simulateNote}>
                For demo purposes, you can simulate a human reviewer processing this case:
              </Text>
              <GradientButton
                title="Simulate Human Review"
                onPress={simulateHumanReview}
                loading={simulating}
                icon={<Ionicons name="person" size={20} color="#fff" />}
              />
            </View>
          )}

          <GradientButton
            title="Back to Dashboard"
            onPress={() => router.replace('/dashboard')}
            variant="secondary"
            icon={<Ionicons name="grid" size={20} color={Colors.textSecondary} />}
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({ label, time, done }: { label: string; time: string; done: boolean }) {
  return (
    <View style={tlStyles.item}>
      <View style={tlStyles.lineContainer}>
        <View style={[tlStyles.dot, done && tlStyles.dotDone]} />
        <View style={[tlStyles.line, done && tlStyles.lineDone]} />
      </View>
      <View style={tlStyles.content}>
        <Text style={[tlStyles.label, done && tlStyles.labelDone]}>{label}</Text>
        <Text style={tlStyles.time}>{time}</Text>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 14, minHeight: 50 },
  lineContainer: { alignItems: 'center', width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.textDim, borderWidth: 2, borderColor: Colors.backgroundCard },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  line: { flex: 1, width: 2, backgroundColor: Colors.textDim, marginVertical: 2 },
  lineDone: { backgroundColor: Colors.success },
  content: { flex: 1, paddingBottom: 12, gap: 2 },
  label: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_500Medium' },
  labelDone: { color: Colors.textPrimary },
  time: { color: Colors.textDim, fontSize: 12, fontFamily: 'Inter_400Regular' },
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
  scrollContent: {
    paddingBottom: 32,
  },
  statusCard: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingVertical: 16,
  },
  statusIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
  },
  statusLabel: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  explanationCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationTitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  explanationText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  reasonsCard: {
    backgroundColor: `${Colors.warning}08`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.warning}20`,
  },
  reasonsTitle: {
    color: Colors.warning,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 6,
  },
  reasonText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  meetingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  meetingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  meetingInfo: {
    flex: 1,
    gap: 4,
  },
  meetingTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  meetingLink: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  meetingTime: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  notesCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notesContent: {
    flex: 1,
    gap: 4,
  },
  notesTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  notesText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  officerInfo: {
    color: Colors.textDim,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  timelineSection: {
    marginBottom: 24,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  timeline: {
    paddingLeft: 4,
  },
  simulateSection: {
    gap: 12,
    marginBottom: 12,
  },
  simulateNote: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
