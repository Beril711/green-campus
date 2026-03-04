import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Text, View, StyleSheet, Platform, StatusBar,
  TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadStoredAuth, logout } from '../store/slices/authSlice';
import { colors, radius, shadows, spacing, typography } from '../theme';
import Svg, { Path } from 'react-native-svg';
import { DrawerContext } from './DrawerContext';

// Ekranlar
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import AddEntryScreen from '../screens/main/AddEntryScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// AI Ekranları
import AIHubScreen from '../screens/ai/AIHubScreen';
import CarbonDNAScreen from '../screens/ai/CarbonDNAScreen';
import CarbonTwinScreen from '../screens/ai/CarbonTwinScreen';
import TimeMachineScreen from '../screens/ai/TimeMachineScreen';
import CarbonMemoryScreen from '../screens/ai/CarbonMemoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const DRAWER_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// useDrawer re-export (backward compat)
export { useDrawer } from './DrawerContext';

// ═══════════════════════════════════════════════════════════════════════════════
//  SVG İKONLARI — Hepsi aynı tarz, react-native-svg
// ═══════════════════════════════════════════════════════════════════════════════
function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V14H9V21H4C3.45 21 3 20.55 3 20V9.5Z" fill={color} />
    </Svg>
  );
}

function AnalyticsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3V21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 16L11 11L14 14L21 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LeaderboardIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9H2V21H6V9Z" fill={color} />
      <Path d="M14 3H10V21H14V3Z" fill={color} />
      <Path d="M22 12H18V21H22V12Z" fill={color} />
    </Svg>
  );
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill={color} />
      <Path d="M12 14C7.58172 14 4 16.0147 4 20V21H20V20C20 16.0147 16.4183 14 12 14Z" fill={color} />
    </Svg>
  );
}

function PlusIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function CompassIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={color} strokeWidth="2" />
      <Path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" fill={color} />
    </Svg>
  );
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={color} strokeWidth="2" />
      <Path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function LogoutIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5C3.89 21 3 20.1 3 19V5C3 3.89 3.89 3 5 3H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17L21 12L16 7M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AIIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={color} />
    </Svg>
  );
}

function DNAIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 3C4 3 8 5 12 5C16 5 20 3 20 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M4 9C4 9 8 11 12 11C16 11 20 9 20 9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M4 15C4 15 8 17 12 17C16 17 20 15 20 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M4 21C4 21 8 19 12 19C16 19 20 21 20 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={color} strokeWidth="2" />
      <Path d="M12 6V12L16 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function BrainIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke={color} strokeWidth="2" />
      <Path d="M12 8V16M8 12H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATUS BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function AppStatusBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.statusBar, { height: insets.top || StatusBar.currentHeight || 44 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB İKON WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function TabIcon({ route, focused }: { route: string; focused: boolean }) {
  const activeColor = colors.g500;
  const inactiveColor = colors.textMuted;
  const iconColor = focused ? activeColor : inactiveColor;
  const iconSize = 22;

  const config: Record<string, { icon: React.ReactNode; label: string; highlight?: boolean }> = {
    Home: {
      icon: <HomeIcon color={iconColor} size={iconSize} />,
      label: 'Ana Sayfa',
    },
    Analytics: {
      icon: <AnalyticsIcon color={iconColor} size={iconSize} />,
      label: 'Analiz',
    },
    Leaderboard: {
      icon: <LeaderboardIcon color={iconColor} size={iconSize} />,
      label: 'Liderlik',
    },
    Profile: {
      icon: <ProfileIcon color={iconColor} size={iconSize} />,
      label: 'Profil',
    },
  };

  const item = config[route];
  if (!item) return null;

  if (item.highlight) {
    return (
      <View style={styles.tabItemCenter}>
        <View style={[styles.highlightBox, focused && styles.highlightBoxActive]}>
          {item.icon}
        </View>
        <Text style={[styles.tabLabel, focused ? styles.tabLabelHighlight : null]}>
          {item.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabItem}>
      {item.icon}
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {item.label}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOM DRAWER PANEL — Pure RN Animated, no native deps
// ═══════════════════════════════════════════════════════════════════════════════
function CustomDrawerPanel({ isOpen, onClose, navigation }: {
  isOpen: boolean;
  onClose: () => void;
  navigation: any;
}) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const { user } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  const menuItems = [
    { label: 'Keşfet', icon: CompassIcon, onPress: () => { } },
    { label: 'AI Özellikleri', icon: AIIcon, onPress: () => { } },
    { label: 'Karbon DNA', icon: DNAIcon, onPress: () => { } },
    { label: 'Karbon İkizi', icon: ProfileIcon, onPress: () => { } },
    { label: 'Zaman Makinesi', icon: ClockIcon, onPress: () => { } },
    { label: 'Karbon Hafıza', icon: BrainIcon, onPress: () => { } },
  ];

  if (!visible && !isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={[styles.drawerHeader, { paddingTop: (insets.top || 44) + 16 }]}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.drawerName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.drawerEmail}>{user?.email}</Text>
        </View>

        {/* Menü */}
        <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
          {menuItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.drawerMenuItem}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                activeOpacity={0.7}
              >
                <IconComp color={colors.g700} size={22} />
                <Text style={styles.drawerMenuLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.drawerFooter, { paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity
            style={styles.drawerMenuItem}
            onPress={() => { onClose(); navigation.navigate('Profile'); }}
            activeOpacity={0.7}
          >
            <SettingsIcon color={colors.textSecondary} size={22} />
            <Text style={[styles.drawerMenuLabel, { color: colors.textSecondary }]}>Ayarlar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => { onClose(); dispatch(logout()); }}
            activeOpacity={0.7}
          >
            <LogoutIcon color={colors.error} size={20} />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LEADERBOARD PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════════════
function LeaderboardScreen() {
  return (
    <View style={styles.placeholder}>
      <LeaderboardIcon color={colors.g700} size={48} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 }}>Liderlik Tablosu</Text>
      <Text style={{ color: colors.textSecondary }}>Yakında...</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOTTOM TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
function MainTabs() {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="Home" focused={focused} /> }}
      />
      <Tab.Screen name="Analytics" component={AnalyticsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="Analytics" focused={focused} /> }}
      />
      <Tab.Screen name="AddEntry" component={AddEntryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.fabBtn, focused && styles.fabBtnActive]}>
              <PlusIcon color="#FFFFFF" size={26} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="Leaderboard" focused={focused} /> }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon route="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP WITH DRAWER — Stack + Custom Drawer overlay
// ═══════════════════════════════════════════════════════════════════════════════
function AppWithDrawer({ navigation }: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ open: () => setDrawerOpen(true), close: () => setDrawerOpen(false) }}>
      <View style={{ flex: 1 }}>
        <MainTabs />
        <CustomDrawerPanel
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          navigation={navigation}
        />
      </View>
    </DrawerContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, []);

  return (
    <NavigationContainer>
      <AppStatusBar />
      <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainApp" component={AppWithDrawer} />
            <Stack.Screen
              name="AddEntryModal"
              component={AddEntryScreen}
              options={{ presentation: 'modal', headerShown: true, title: 'Emisyon Ekle' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── STATUS BAR ────────────────────────────────────────────────────────────
  statusBar: {
    backgroundColor: colors.background,
  },

  // ── TAB BAR ───────────────────────────────────────────────────────────────
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    ...shadows.lg,
  },

  // ── TAB ITEMS ─────────────────────────────────────────────────────────────
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 56 },
  tabLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },
  tabLabelActive: { color: colors.g500, fontWeight: '700' },
  tabItemCenter: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 56 },
  highlightBox: {
    width: 44, height: 36, borderRadius: 12,
    backgroundColor: colors.g100, justifyContent: 'center', alignItems: 'center',
  },
  highlightBoxActive: { backgroundColor: colors.g500 },
  tabLabelHighlight: { color: colors.g500, fontWeight: '700' },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fabBtn: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.g500,
    justifyContent: 'center', alignItems: 'center', marginTop: -24,
    shadowColor: colors.g600, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  fabBtnActive: { backgroundColor: colors.g400, transform: [{ scale: 1.08 }] },

  // ── CUSTOM DRAWER ─────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.lg,
    zIndex: 100,
  },
  drawerHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.g500,
    borderTopRightRadius: 24,
  },
  drawerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.g500, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  drawerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  drawerName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  drawerEmail: { color: colors.g200, fontSize: 13, marginTop: 2 },
  drawerMenu: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  drawerMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 2,
  },
  drawerMenuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  drawerFooter: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.error },

  // ── PLACEHOLDER ───────────────────────────────────────────────────────────
  placeholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 4, backgroundColor: colors.background,
  },
});
