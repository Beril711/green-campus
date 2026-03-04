// src/theme/index.ts
// Karbon Ayak İzi Tema Sistemi

export const colors = {
  // Yeşil paleti
  g900: '#0D3B1E',
  g800: '#1B5E20',
  g700: '#2E7D32',
  g600: '#388E3C',
  g500: '#4CAF50',
  g400: '#66BB6A',
  g300: '#81C784',
  g200: '#A5D6A7',
  g100: '#C8E6C9',
  g50: '#E8F5E9',

  // Semantik
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceDark: '#0A1F0D',
  text: '#1A2E1A',
  textSecondary: '#5A6F5A',
  textMuted: '#8A9F8A',
  border: '#D4ECD4',

  // Kategori renkleri
  transport: '#FF9800',
  energy: '#FFEE58',
  food: '#66BB6A',
  waste: '#26A69A',
  water: '#42A5F5',
  digital: '#AB47BC',

  // Durum
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#EF5350',
  info: '#42A5F5',

  // Tier renkleri (gamification)
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',

  // Karanlık mod
  dark: {
    background: '#0A1A0C',
    surface: '#111E12',
    surface2: '#162118',
    text: '#E8F5E9',
    textSecondary: '#A5D6A7',
    border: 'rgba(76,175,80,0.18)',
  }
} as const;

export const typography = {
  // Font aileleri
  display: 'Fraunces_700Bold',
  body: 'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  mono: 'SpaceMono_400Regular',

  // Font boyutları
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },

  // Satır yükseklikleri
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Kategori rengi yardımcısı
export const getCategoryColor = (slug: string): string => {
  const map: Record<string, string> = {
    transport: colors.transport,
    energy: colors.energy,
    food: colors.food,
    waste: colors.waste,
    water: colors.water,
    digital: colors.digital,
  };
  return map[slug] ?? colors.g500;
};

// Kategori ikonu yardımcısı
export const getCategoryIcon = (slug: string): string => {
  const map: Record<string, string> = {
    transport: '🚗',
    energy: '⚡',
    food: '🍽️',
    waste: '♻️',
    water: '💧',
    digital: '💻',
  };
  return map[slug] ?? '🌿';
};

const theme = { colors, typography, spacing, radius, shadows };
export default theme;
