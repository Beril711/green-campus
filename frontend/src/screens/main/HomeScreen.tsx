// src/screens/main/HomeScreen.tsx
import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTodaySummary } from '../../store/slices/emissionSlice';
import { colors, spacing, radius, typography, shadows, getCategoryColor, getCategoryIcon } from '../../theme';
import { useDrawer } from '../../navigation/DrawerContext';
import Svg, { Path } from 'react-native-svg';



const CATEGORIES = ['transport', 'energy', 'food', 'waste', 'water', 'digital'];

export default function HomeScreen({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void } }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { todaySummary, isLoading } = useSelector((s: RootState) => s.emissions);
  const { xp, streak } = useSelector((s: RootState) => s.gamification);
  const drawer = useDrawer();

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTodaySummary());
    }, [])
  );

  const goalPct = todaySummary
    ? Math.min(100, (todaySummary.total_co2 / todaySummary.daily_goal) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => dispatch(fetchTodaySummary())}
          tintColor={colors.g500}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={drawer.open} style={styles.menuBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M3 6H21M3 12H21M3 18H21" stroke={colors.g800} strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Merhaba, {user?.first_name} 👋</Text>
            <Text style={styles.subGreeting}>Bugünkü karbon durumun</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Şeridi — Modern 3-sütun */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#6C63FF' }]}>
          <View style={styles.statCardInner}>
            <Text style={styles.statEmoji}>⚡</Text>
            <View>
              <Text style={styles.statNumber}>{xp?.level ?? 1}</Text>
              <Text style={styles.statSub}>Seviye</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#FF6B6B' }]}>
          <View style={styles.statCardInner}>
            <Text style={styles.statEmoji}>🔥</Text>
            <View>
              <Text style={styles.statNumber}>{streak?.current ?? 0}</Text>
              <Text style={styles.statSub}>Gün Seri</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#2ECB71' }]}>
          <View style={styles.statCardInner}>
            <Text style={styles.statEmoji}>📝</Text>
            <View>
              <Text style={styles.statNumber}>{todaySummary?.entry_count ?? 0}</Text>
              <Text style={styles.statSub}>Giriş</Text>
            </View>
          </View>
        </View>
      </View>

      {/* CO2 Gösterge Kartı — Premium Tasarım */}
      <View style={styles.co2Card}>
        <View style={styles.co2TopRow}>
          <View>
            <Text style={styles.co2CardTitle}>Bugünkü Emisyon</Text>
            <Text style={styles.co2GoalText}>Hedef: {todaySummary?.daily_goal ?? 5} kg CO₂</Text>
          </View>
          {/* Circular indicator */}
          <View style={styles.circleWrap}>
            <View style={styles.circleOuter}>
              <View style={[styles.circleProgress, {
                borderTopColor: goalPct > 100 ? '#FF6B6B' : goalPct > 80 ? '#FFB74D' : '#2ECB71',
                borderRightColor: goalPct > 50 ? (goalPct > 100 ? '#FF6B6B' : goalPct > 80 ? '#FFB74D' : '#2ECB71') : 'rgba(255,255,255,0.15)',
                borderBottomColor: goalPct > 75 ? (goalPct > 100 ? '#FF6B6B' : goalPct > 80 ? '#FFB74D' : '#2ECB71') : 'rgba(255,255,255,0.15)',
                borderLeftColor: goalPct > 25 ? (goalPct > 100 ? '#FF6B6B' : goalPct > 80 ? '#FFB74D' : '#2ECB71') : 'rgba(255,255,255,0.15)',
                transform: [{ rotate: '45deg' }],
              }]} />
              <Text style={styles.circlePct}>{goalPct.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.co2ValueRow}>
          <Text style={styles.co2BigValue}>
            {todaySummary ? todaySummary.total_co2.toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.co2UnitLabel}>kg CO₂</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.co2ProgressTrack}>
          <View style={[styles.co2ProgressFill, {
            width: `${Math.min(goalPct, 100)}%`,
            backgroundColor: goalPct > 100 ? '#FF6B6B' : goalPct > 80 ? '#FFB74D' : '#2ECB71',
          }]} />
        </View>

        <Text style={styles.co2StatusText}>
          {todaySummary?.goal_achieved
            ? '✅ Harika! Günlük hedefinin içindesin.'
            : `⚡ Hedefe ${todaySummary?.remaining?.toFixed(1) ?? '—'} kg kaldı`
          }
        </Text>
      </View>

      {/* Kategori Dağılımı — Modern */}
      {todaySummary && todaySummary.total_co2 > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Bugünkü Dağılım</Text>
          {CATEGORIES.map((cat) => {
            const val = todaySummary.by_category[cat] ?? 0;
            if (val === 0) return null;
            const pct = (val / todaySummary.total_co2) * 100;
            return (
              <View key={cat} style={styles.catRow}>
                <View style={styles.catLeft}>
                  <Text style={styles.catEmoji}>{getCategoryIcon(cat)}</Text>
                  <Text style={styles.catName}>{CAT_NAMES[cat] ?? cat}</Text>
                </View>
                <View style={styles.catBarWrap}>
                  <View style={[styles.catBar, {
                    width: `${pct}%`,
                    backgroundColor: getCategoryColor(cat),
                  }]} />
                </View>
                <Text style={styles.catVal}>{val.toFixed(1)} kg</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Aktif Görevler */}
      <View style={styles.card}>
        <View style={styles.questHeader}>
          <Text style={styles.sectionTitle}>⚔️ Aktif Görevler</Text>
        </View>
        {QUESTS.map((quest, idx) => (
          <View key={idx} style={[styles.questRow, idx < QUESTS.length - 1 && styles.questBorder]}>
            <View style={styles.questLeft}>
              <Text style={styles.questIcon}>{quest.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questName}>{quest.name}</Text>
                <View style={styles.questProgressTrack}>
                  <View style={[styles.questProgressFill, {
                    width: `${quest.progress}%`,
                    backgroundColor: quest.color,
                  }]} />
                </View>
              </View>
            </View>
            <View style={styles.questRight}>
              <Text style={styles.questXP}>+{quest.xp} XP</Text>
              <Text style={[styles.questType, { color: quest.color }]}>{quest.type}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

// Kategori Türkçe isimleri
const CAT_NAMES: Record<string, string> = {
  transport: 'Ulaşım',
  energy: 'Enerji',
  food: 'Beslenme',
  waste: 'Atık',
  water: 'Su',
  digital: 'Dijital',
};

// Aktif görev verileri (backend'den çekilecek)
const QUESTS = [
  { icon: '🏃', name: 'Merdiven Günü', xp: 30, type: 'Günlük', progress: 75, color: '#4CAF50' },
  { icon: '🔥', name: 'Karbon Canavarı', xp: 500, type: 'Boss', progress: 45, color: '#FF9800' },
  { icon: '🧬', name: 'DNA Evrimi', xp: 400, type: 'Özel', progress: 60, color: '#42A5F5' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontSize: typography.size.xl, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.g500, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: typography.size.base },
  menuBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },

  // ── Stats Chips (Modern 3-kollu) ──
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderLeftWidth: 3, ...shadows.sm,
  },
  statCardInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statEmoji: { fontSize: 22 },
  statNumber: { fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  statSub: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },

  // ── CO2 Premium Kartı ──
  co2Card: {
    backgroundColor: colors.g500,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  co2TopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  co2CardTitle: { fontSize: typography.size.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  co2GoalText: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  circleWrap: { alignItems: 'center' },
  circleOuter: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  circleProgress: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    borderWidth: 3,
  },
  circlePct: { fontSize: 13, fontWeight: '800', color: '#fff' },

  co2ValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.lg, gap: 6 },
  co2BigValue: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1.5 },
  co2UnitLabel: { fontSize: typography.size.md, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  co2ProgressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3, marginTop: spacing.lg, overflow: 'hidden',
  },
  co2ProgressFill: { height: 6, borderRadius: 3 },
  co2StatusText: {
    fontSize: typography.size.xs, color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.sm, fontWeight: '500',
  },

  // ── Ortak Kart ──
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  sectionTitle: { fontSize: typography.size.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  // ── Kategori Dağılımı (Modern) ──
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 14 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 130 },
  catEmoji: { fontSize: 22 },
  catName: { fontSize: typography.size.base, fontWeight: '600', color: colors.text },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#F0F1F5', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catVal: { width: 55, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right', fontWeight: '600' },

  // ── Aktif Görevler ──
  questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  questBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  questLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  questIcon: { fontSize: 22 },
  questName: { fontSize: typography.size.base, fontWeight: '600', color: colors.text, marginBottom: 6 },
  questProgressTrack: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  questProgressFill: { height: 6, borderRadius: 3 },
  questRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  questXP: { fontSize: typography.size.sm, fontWeight: '700', color: colors.g500 },
  questType: { fontSize: typography.size.xs, fontWeight: '600', marginTop: 2 },
});

