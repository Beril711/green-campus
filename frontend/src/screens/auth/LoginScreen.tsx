// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { colors, spacing, radius, typography, shadows } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre zorunludur.');
      return;
    }
    dispatch(clearError());
    const result = await dispatch(login({ email: email.trim().toLowerCase(), password }));
    if (login.fulfilled.match(result)) {
      navigation.replace('MainApp');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Başlık */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>Karbon Ayak İzi</Text>
          <Text style={styles.subtitle}>Karbon ayak izini takip et, dünyayı dönüştür</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Giriş Yap</Text>

          {/* Hata mesajı */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {typeof error === 'string' ? error : 'Giriş başarısız. Bilgilerinizi kontrol edin.'}</Text>
            </View>
          )}

          {/* E-posta */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Üniversite E-postası</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="ad.soyad@ahievran.edu.tr"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Text>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          {/* Giriş butonu */}
          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Giriş Yap</Text>
            }
          </TouchableOpacity>

          {/* Kayıt ol linki */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: colors.background },
  container:  { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', paddingBottom: spacing['4xl'] },

  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logo:     { fontSize: 64, marginBottom: spacing.md },
  title:    { fontSize: typography.size['3xl'], fontWeight: '800', color: colors.g800 },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },

  form:       { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing['2xl'], ...shadows.lg },
  formTitle:  { fontSize: typography.size.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginBottom:    spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: typography.size.sm },

  inputGroup: { marginBottom: spacing.lg },
  label:      { fontSize: typography.size.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  inputWrap:  {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: colors.g50,
    borderRadius:   radius.md,
    borderWidth:    1,
    borderColor:    colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { fontSize: 16, marginRight: spacing.sm },
  input:     {
    flex:            1,
    paddingVertical: spacing.md,
    fontSize:        typography.size.base,
    color:           colors.text,
  },
  eyeBtn:    { padding: spacing.sm },

  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.lg, marginTop: -spacing.sm },
  forgotText: { fontSize: typography.size.sm, color: colors.g700, fontWeight: '600' },

  btnPrimary: {
    backgroundColor: colors.g700,
    borderRadius:    radius.lg,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    marginBottom:    spacing.lg,
    ...shadows.md,
  },
  btnDisabled:    { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: typography.size.base, fontWeight: '700' },

  registerRow:  { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: colors.textSecondary, fontSize: typography.size.sm },
  registerLink: { color: colors.g700, fontWeight: '700', fontSize: typography.size.sm },
});
