import React, { useState, useEffect, useCallback } from 'react';
import { addEntry, fetchCategories, fetchFactors, fetchTodaySummary } from '../../store/slices/emissionSlice';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { AppDispatch, RootState } from '../../store';
import { colors, spacing, radius, typography, shadows, getCategoryColor, getCategoryIcon } from '../../theme';
import { format } from 'date-fns';
import type { EmissionFactor } from '../../types';

type Step = 'category' | 'factor' | 'quantity';

interface Props {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
  route: { params?: { category?: string } };
}

export default function AddEntryScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, factors, isSubmitting } = useSelector((s: RootState) => s.emissions);

  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setCategory] = useState<string>(route.params?.category ?? '');
  const [selectedFactor, setFactor] = useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  // Her odaklanmada formu sıfırla (+ butonuna her basıldığında kategori seçimine dön)
  useFocusEffect(
    useCallback(() => {
      setStep('category');
      setCategory(route.params?.category ?? '');
      setFactor(null);
      setQuantity('');
      setNote('');
      dispatch(fetchCategories());
    }, [])
  );

  useEffect(() => {
    if (selectedCategory) {
      dispatch(fetchFactors(selectedCategory));
      if (route.params?.category) setStep('factor');
    }
  }, [selectedCategory]);

  const filteredFactors = factors.filter(
    (f: any) => f.category_name || true // API slug'ına göre filtrele
  );

  const handleSubmit = async () => {
    if (!selectedFactor || !quantity) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Hata', 'Geçerli bir miktar girin.');
      return;
    }

    const result = await dispatch(addEntry({
      factor: selectedFactor.id,
      quantity: qty,
      note,
      date: format(new Date(), 'yyyy-MM-dd'),
    }));

    if (addEntry.fulfilled.match(result)) {
      dispatch(fetchTodaySummary());
      Alert.alert(
        '✅ Kaydedildi',
        `${selectedFactor.name_tr}: ${result.payload.co2_kg} kg CO₂`,
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Hata', 'Kayıt başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Adım göstergesi */}
      <View style={styles.stepBar}>
        {(['category', 'factor', 'quantity'] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, (step === 'factor' && i === 0 || step === 'quantity' && i < 2) && styles.stepDotDone]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={styles.stepLabel}>{['Kategori', 'Aktivite', 'Miktar'][i]}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ADIM 1: Kategori Seç */}
        {step === 'category' && (
          <>
            <Text style={styles.stepTitle}>Kategori Seçin</Text>
            <View style={styles.grid}>
              {categories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.slug}
                  style={[styles.catCard, { borderColor: getCategoryColor(cat.slug) }]}
                  onPress={() => { setCategory(cat.slug); setStep('factor'); }}
                >
                  <Text style={styles.catCardIcon}>{cat.icon || getCategoryIcon(cat.slug)}</Text>
                  <Text style={styles.catCardName}>{cat.name_tr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ADIM 2: Faktör Seç */}
        {step === 'factor' && (
          <>
            <TouchableOpacity onPress={() => setStep('category')}>
              <Text style={styles.back}>← Geri</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Aktivite Seçin</Text>
            {factors.map((f: any) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.factorRow, selectedFactor?.id === f.id && styles.factorRowSelected]}
                onPress={() => { setFactor(f); setStep('quantity'); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.factorName}>{f.name_tr}</Text>
                  <Text style={styles.factorMeta}>{f.co2_per_unit} kg CO₂ / {f.unit}</Text>
                </View>
                {selectedFactor?.id === f.id && <Text>✅</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ADIM 3: Miktar Gir */}
        {step === 'quantity' && selectedFactor && (
          <>
            <TouchableOpacity onPress={() => setStep('factor')}>
              <Text style={styles.back}>← Geri</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Miktar Girin</Text>

            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedFactor.name_tr}</Text>
              <Text style={styles.selectedMeta}>{selectedFactor.co2_per_unit} kg CO₂ / {selectedFactor.unit}</Text>
            </View>

            <Text style={styles.inputLabel}>Miktar ({selectedFactor.unit})</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder={`Örn: 5 ${selectedFactor.unit}`}
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
            />

            {/* Anlık CO2 hesaplama */}
            {quantity && !isNaN(parseFloat(quantity)) && (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Tahmini CO₂</Text>
                <Text style={styles.previewValue}>
                  {(parseFloat(quantity) * selectedFactor.co2_per_unit).toFixed(3)} kg
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Not (opsiyonel)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              multiline
              placeholder="Açıklama ekleyin..."
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!quantity || isSubmitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!quantity || isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>💾 Kaydet</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Step Bar ──
  stepBar: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing['3xl'],
    padding: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8E9EE', justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.g500 },
  stepDotDone: { backgroundColor: colors.g400 },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stepLabel: { fontSize: typography.size.xs, color: colors.textSecondary, fontWeight: '500' },

  // ── Content ──
  content: { padding: spacing.lg, paddingBottom: 100 },
  stepTitle: { fontSize: typography.size.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  back: { color: colors.g500, fontWeight: '700', marginBottom: spacing.lg, fontSize: typography.size.base },

  // ── Kategori Grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  catCard: {
    width: '30%', aspectRatio: 0.95, borderRadius: radius.xl,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, ...shadows.sm, paddingVertical: spacing.md,
  },
  catCardIcon: { fontSize: 36, marginBottom: 6 },
  catCardName: { fontSize: typography.size.sm, fontWeight: '700', color: colors.text, textAlign: 'center' },

  // ── Faktör Listesi ──
  factorRow: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, borderLeftColor: colors.g100,
    ...shadows.sm,
  },
  factorRowSelected: { borderLeftColor: colors.g500, backgroundColor: '#F0FFF0' },
  factorName: { fontSize: typography.size.base, fontWeight: '700', color: colors.text },
  factorMeta: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 3 },

  // ── Seçili Bilgi ──
  selectedInfo: {
    backgroundColor: '#F0FFF0', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderLeftWidth: 3, borderLeftColor: colors.g500,
  },
  selectedName: { fontSize: typography.size.base, fontWeight: '700', color: colors.g500 },
  selectedMeta: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  // ── Input ──
  inputLabel: { fontSize: typography.size.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg, fontSize: typography.size.base,
    color: colors.text, marginBottom: spacing.lg,
  },

  // ── CO2 Önizleme ──
  preview: {
    backgroundColor: colors.g500, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center',
  },
  previewLabel: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  previewValue: { fontSize: typography.size['2xl'], fontWeight: '800', color: '#fff', marginTop: 4 },

  // ── Submit ──
  submitBtn: {
    backgroundColor: colors.g500, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', marginTop: spacing.md,
    ...shadows.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: typography.size.base, fontWeight: '700' },
});
