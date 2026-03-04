import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { colors, spacing, radius, typography, shadows, getCategoryColor, getCategoryIcon } from '../../theme';
import api from '../../services/api';
import type { WeeklyDayData, TrendData, BudgetData } from '../../types';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 160;
const CATEGORIES = ['transport', 'energy', 'food', 'waste', 'water', 'digital'];

export default function AnalyticsScreen() {
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([]);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        api.get('/analytics/chart/weekly/'),
        api.get('/analytics/trend/'),
      ]);
      setWeeklyData(wRes.data);
      setTrend(tRes.data);
      // Bütçe opsiyonel
      api.get('/analytics/budget/').then(r => setBudget(r.data)).catch(() => { });
    } catch (err) {
      Alert.alert('Hata', 'Analiz verileri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.g600} />
      </View>
    );
  }

  const maxCO2 = Math.max(...weeklyData.map(d => d.total), 1);
  const barWidth = (width - spacing.lg * 2 - spacing.sm * 6) / 7;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Haftalık Bar Grafik */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📊 Haftalık Emisyon</Text>
          <Text style={styles.cardSub}>Son 7 gün (kg CO₂)</Text>
        </View>

        {/* Kategori filtre */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilter}>
          <TouchableOpacity
            style={[styles.catChip, !activeCategory && styles.catChipActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.catChipText, !activeCategory && styles.catChipTextActive]}>Tümü</Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activeCategory === cat && { borderColor: getCategoryColor(cat), backgroundColor: getCategoryColor(cat) + '20' }]}
              onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              <Text style={styles.catChipText}>{getCategoryIcon(cat)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bar chart */}
        <View style={styles.chart}>
          {weeklyData.map((day, i) => {
            const cats = activeCategory ? [activeCategory] : CATEGORIES;
            const total = cats.reduce((sum, c) => sum + (Number(day[c]) || 0), 0);
            const heightPct = total / maxCO2;

            return (
              <View key={i} style={[styles.barCol, { width: barWidth }]}>
                <Text style={styles.barValue}>{total > 0 ? total.toFixed(1) : ''}</Text>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  {/* Yığılı barlar */}
                  {!activeCategory ? (
                    <View style={[styles.stackedBar, { height: heightPct * CHART_HEIGHT }]}>
                      {CATEGORIES.map((cat, ci) => {
                        const catVal = Number(day[cat]) || 0;
                        const catPct = catVal > 0 ? catVal / total : 0;
                        return (
                          <View
                            key={cat}
                            style={[styles.stackSegment, {
                              flex: catPct,
                              backgroundColor: getCategoryColor(cat),
                              opacity: catPct > 0 ? 1 : 0,
                            }]}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <View style={[styles.singleBar, {
                      height: heightPct * CHART_HEIGHT,
                      backgroundColor: getCategoryColor(activeCategory),
                    }]} />
                  )}
                </View>
                <Text style={styles.barDay}>{day.day}</Text>
              </View>
            );
          })}
        </View>

        {/* Kategori legend */}
        <View style={styles.legend}>
          {CATEGORIES.map(cat => (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryColor(cat) }]} />
              <Text style={styles.legendText}>{getCategoryIcon(cat)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trend Karşılaştırması */}
      {trend && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Trend Analizi</Text>

          <View style={styles.trendRow}>
            <View style={styles.trendBox}>
              <Text style={styles.trendLabel}>Bu Hafta</Text>
              <Text style={styles.trendValue}>{trend.this_week.total.toFixed(1)}</Text>
              <Text style={styles.trendUnit}>kg CO₂</Text>
            </View>
            <View style={styles.trendArrow}>
              <Text style={{ fontSize: 28 }}>
                {(trend.change_pct || 0) < 0 ? '📉' : '📈'}
              </Text>
              <Text style={[styles.trendPct, {
                color: (trend.change_pct || 0) < 0 ? colors.success : colors.error
              }]}>
                {trend.change_pct !== null
                  ? `${trend.change_pct > 0 ? '+' : ''}${trend.change_pct}%`
                  : '—'
                }
              </Text>
            </View>
            <View style={styles.trendBox}>
              <Text style={styles.trendLabel}>Geçen Hafta</Text>
              <Text style={styles.trendValue}>{trend.last_week.total.toFixed(1)}</Text>
              <Text style={styles.trendUnit}>kg CO₂</Text>
            </View>
          </View>

          <View style={styles.trendDetail}>
            <Text style={styles.trendDetailText}>
              Günlük ort: {trend.this_week.avg_daily} kg  ·  Geçen hafta: {trend.last_week.avg_daily} kg
            </Text>
          </View>
        </View>
      )}

      {/* Karbon Bütçesi */}
      {budget && (
        <View style={[styles.card, budget.is_exceeded && styles.cardWarning]}>
          <Text style={styles.cardTitle}>💰 Aylık Karbon Bütçesi</Text>
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetMain}>{budget.spent_kg.toFixed(1)} kg</Text>
              <Text style={styles.budgetSub}>Harcanan / {budget.budget_kg} kg</Text>
            </View>
            <View style={styles.budgetPctCircle}>
              <Text style={styles.budgetPct}>%{budget.usage_pct}</Text>
            </View>
          </View>

          <View style={styles.budgetTrack}>
            <View style={[styles.budgetFill, {
              width: `${Math.min(100, budget.usage_pct)}%`,
              backgroundColor: budget.is_exceeded ? colors.error : budget.usage_pct > 80 ? colors.warning : colors.g500,
            }]} />
          </View>

          {budget.is_exceeded && (
            <Text style={styles.exceededWarning}>⚠️ Aylık bütçeni aştın! {budget.remaining_kg === 0 ? '' : `${budget.remaining_kg.toFixed(1)} kg kaldı`}</Text>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardWarning: { borderWidth: 2, borderColor: colors.error },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { fontSize: typography.size.base, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: typography.size.xs, color: colors.textSecondary },

  catFilter: { marginBottom: spacing.md },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  catChipActive: { borderColor: colors.g600, backgroundColor: colors.g50 },
  catChipText: { fontSize: typography.size.xs, color: colors.textSecondary },
  catChipTextActive: { color: colors.g800, fontWeight: '700' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.md },
  barCol: { alignItems: 'center', gap: spacing.xs },
  barValue: { fontSize: 9, color: colors.textSecondary, height: 14 },
  barTrack: { width: '100%', justifyContent: 'flex-end', backgroundColor: colors.g50, borderRadius: radius.sm, overflow: 'hidden' },
  stackedBar: { width: '100%', borderRadius: radius.sm, overflow: 'hidden', flexDirection: 'column-reverse' },
  stackSegment: { minHeight: 2 },
  singleBar: { width: '100%', borderRadius: radius.sm },
  barDay: { fontSize: 9, color: colors.textSecondary },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typography.size.xs, color: colors.textSecondary },

  trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  trendBox: { alignItems: 'center' },
  trendLabel: { fontSize: typography.size.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  trendValue: { fontSize: typography.size.xl, fontWeight: '800', color: colors.text },
  trendUnit: { fontSize: typography.size.xs, color: colors.textSecondary },
  trendArrow: { alignItems: 'center' },
  trendPct: { fontSize: typography.size.lg, fontWeight: '700' },
  trendDetail: { marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.g50, borderRadius: radius.sm },
  trendDetailText: { fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'center' },

  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  budgetMain: { fontSize: typography.size.xl, fontWeight: '800', color: colors.text },
  budgetSub: { fontSize: typography.size.xs, color: colors.textSecondary },
  budgetPctCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.g800, justifyContent: 'center', alignItems: 'center',
  },
  budgetPct: { color: '#fff', fontWeight: '800', fontSize: typography.size.sm },
  budgetTrack: { height: 10, backgroundColor: colors.g50, borderRadius: 5, marginTop: spacing.md, overflow: 'hidden' },
  budgetFill: { height: 10, borderRadius: 5 },
  exceededWarning: { color: colors.error, fontSize: typography.size.sm, marginTop: spacing.sm, fontWeight: '600' },
});
