import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import api from '../../services/api';
import type { Badge, GamificationStatus, LeaderboardData } from '../../types';

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#B9F2FF',
};

export default function ProfileScreen({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void } }) {
  const { user } = useSelector((s: RootState) => s.auth);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [xpData, setXpData] = useState<GamificationStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'stats'>('badges');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, gRes, lRes] = await Promise.all([
        api.get('/gamification/badges/'),
        api.get('/gamification/status/'),
        api.get('/gamification/leaderboard/'),
      ]);
      setBadges(bRes.data);
      setXpData(gRes.data);
      setLeaderboard(lRes.data);
    } catch (err) {
      Alert.alert('Hata', 'Profil verileri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.g600} /></View>;
  }

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);
  const xpToNext = xpData?.xp?.xp_to_next ?? 0;
  const totalXP = xpData?.xp?.total ?? 0;
  const level = xpData?.xp?.level ?? 1;
  const thresholds = xpData?.xp?.level_thresholds ?? [0, 100];
  const levelStart = thresholds[level - 1] ?? 0;
  const levelEnd = thresholds[level] ?? 100;
  const levelProgress = levelEnd > levelStart
    ? ((totalXP - levelStart) / (levelEnd - levelStart)) * 100
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Profil Kartı */}
      <View style={[styles.card, styles.profileCard]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
        </View>

        <Text style={styles.profileName}>{user?.full_name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <Text style={styles.profileRole}>
          {user?.role === 'student' ? '🎓 Öğrenci' : '👨‍🏫 Personel'}
        </Text>

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>⚡ Seviye {level}</Text>
            <Text style={styles.xpNumbers}>{totalXP} / {levelEnd} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(100, levelProgress)}%` }]} />
          </View>
          <Text style={styles.xpHint}>Sonraki seviyeye {xpToNext} XP kaldı</Text>
        </View>

        {/* Streak */}
        {xpData?.streak && (
          <View style={styles.streakRow}>
            <View style={styles.streakChip}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakValue}>{xpData.streak.current} günlük seri</Text>
            </View>
            <View style={styles.streakChip}>
              <Text style={styles.streakIcon}>🏆</Text>
              <Text style={styles.streakValue}>En uzun: {xpData.streak.longest} gün</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editBtnText}>✏️ Profili Düzenle</Text>
        </TouchableOpacity>
      </View>

      {/* Liderboard Satırı */}
      {leaderboard?.my_rank && (
        <View style={[styles.card, styles.rankCard]}>
          <Text style={styles.rankLabel}>Bu Haftaki Sıralamanız</Text>
          <View style={styles.rankRow}>
            <Text style={styles.rankNumber}>#{leaderboard.my_rank}</Text>
            <View>
              <Text style={styles.rankCo2}>{leaderboard.my_co2?.toFixed(2)} kg CO₂</Text>
              <Text style={styles.rankSub}>{leaderboard.week_start} haftası</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
              <Text style={styles.rankLink}>Tümünü Gör →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab seçici */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.tabActive]}
          onPress={() => setActiveTab('badges')}
        >
          <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
            🏅 Rozetler ({earnedBadges.length}/{badges.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            📊 İstatistikler
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rozet Grid */}
      {activeTab === 'badges' && (
        <>
          {earnedBadges.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Kazanılan Rozetler</Text>
              <View style={styles.badgeGrid}>
                {earnedBadges.map((b) => (
                  <TouchableOpacity key={b.id} style={styles.badgeCard} onPress={() => { }}>
                    <View style={[styles.badgeIcon, { borderColor: TIER_COLORS[b.tier] }]}>
                      <Text style={styles.badgeEmoji}>{b.icon}</Text>
                    </View>
                    <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                    <Text style={[styles.badgeTier, { color: TIER_COLORS[b.tier] }]}>
                      {b.tier.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {lockedBadges.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Kilitli Rozetler</Text>
              <View style={styles.badgeGrid}>
                {lockedBadges.map((b) => (
                  <View key={b.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                    <View style={[styles.badgeIcon, styles.badgeIconLocked]}>
                      <Text style={[styles.badgeEmoji, { opacity: 0.3 }]}>{b.icon}</Text>
                    </View>
                    <Text style={[styles.badgeName, { color: colors.textMuted }]} numberOfLines={2}>{b.name}</Text>
                    <Text style={styles.badgeXP}>+{b.xp_reward} XP</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {/* İstatistikler */}
      {activeTab === 'stats' && (
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statIcon}>🌱</Text>
            <Text style={styles.statLabel}>Toplam XP</Text>
            <Text style={styles.statValue}>{totalXP}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statIcon}>🏅</Text>
            <Text style={styles.statLabel}>Kazanılan Rozet</Text>
            <Text style={styles.statValue}>{earnedBadges.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statLabel}>Güncel Seri</Text>
            <Text style={styles.statValue}>{xpData?.streak?.current ?? 0} gün</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statLabel}>En Uzun Seri</Text>
            <Text style={styles.statValue}>{xpData?.streak?.longest ?? 0} gün</Text>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md, ...shadows.md },
  profileCard: { alignItems: 'center' },
  rankCard: { backgroundColor: colors.g500 },

  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.g500, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: typography.size.xl, fontWeight: '800' },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.g500, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.surface },
  levelBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  profileName: { fontSize: typography.size.xl, fontWeight: '800', color: colors.text },
  profileEmail: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  profileRole: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.xs },

  xpSection: { width: '100%', marginTop: spacing.lg },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  xpLabel: { fontSize: typography.size.sm, fontWeight: '700', color: colors.text },
  xpNumbers: { fontSize: typography.size.xs, color: colors.textSecondary },
  xpTrack: { height: 10, backgroundColor: colors.g50, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.xs },
  xpFill: { height: 10, backgroundColor: colors.g500, borderRadius: 5 },
  xpHint: { fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right' },

  streakRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, width: '100%' },
  streakChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.g50, borderRadius: radius.md, padding: spacing.sm },
  streakIcon: { fontSize: 16 },
  streakValue: { fontSize: typography.size.xs, fontWeight: '600', color: colors.text, flex: 1 },

  editBtn: { marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  editBtnText: { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: '600' },

  rankLabel: { fontSize: typography.size.xs, color: colors.g300, marginBottom: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rankNumber: { fontSize: typography.size['3xl'], fontWeight: '800', color: '#fff' },
  rankCo2: { fontSize: typography.size.base, fontWeight: '700', color: '#fff' },
  rankSub: { fontSize: typography.size.xs, color: colors.g300 },
  rankLink: { fontSize: typography.size.xs, color: colors.g300, fontWeight: '600' },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xs, marginBottom: spacing.lg, ...shadows.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.md },
  tabActive: { backgroundColor: colors.g500 },
  tabText: { fontSize: typography.size.xs, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },

  sectionLabel: { fontSize: typography.size.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  badgeCard: { width: '30%', alignItems: 'center', gap: spacing.xs },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.g400, backgroundColor: colors.g50, justifyContent: 'center', alignItems: 'center' },
  badgeIconLocked: { borderColor: colors.border, backgroundColor: colors.background },
  badgeEmoji: { fontSize: 24 },
  badgeName: { fontSize: typography.size.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
  badgeTier: { fontSize: 9, fontWeight: '700' },
  badgeXP: { fontSize: 9, color: colors.textMuted },

  statsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm, overflow: 'hidden' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.g50 },
  statIcon: { fontSize: 20, width: 28 },
  statLabel: { flex: 1, fontSize: typography.size.base, color: colors.text },
  statValue: { fontSize: typography.size.base, fontWeight: '700', color: colors.g500 },
});
