// src/types/index.ts
// Tüm paylaşılan tip tanımları

// ── Navigation ──────────────────────────────────────────────────
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: undefined;
    MainApp: undefined;
    AddEntryModal: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Analytics: undefined;
    AddEntry: { category?: string } | undefined;
    Leaderboard: undefined;
    Profile: undefined;
};

export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type AddEntryRouteProp = RouteProp<MainTabParamList, 'AddEntry'>;

// ── Auth ────────────────────────────────────────────────────────
export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
    profile?: {
        daily_carbon_goal: number;
        notify_daily: boolean;
        is_public: boolean;
    };
}

// ── Emissions ───────────────────────────────────────────────────
export interface EmissionCategory {
    slug: string;
    name_tr: string;
    icon: string;
    is_active: boolean;
}

export interface EmissionFactor {
    id: number;
    name_tr: string;
    category_name: string;
    category_slug: string;
    co2_per_unit: number;
    unit: string;
    is_active: boolean;
}

export interface EmissionEntry {
    id: string;
    factor: number;
    factor_name: string;
    category_slug: string;
    category_icon: string;
    quantity: string;
    unit: string;
    co2_kg: string;
    note: string;
    date: string;
    is_predicted: boolean;
    created_at: string;
}

export interface TodaySummary {
    date: string;
    total_co2: number;
    entry_count: number;
    daily_goal: number;
    goal_achieved: boolean;
    remaining: number;
    by_category: Record<string, number>;
}

// ── Gamification ────────────────────────────────────────────────
export interface XPData {
    total: number;
    level: number;
    xp_to_next: number;
    level_thresholds?: number[];
}

export interface StreakData {
    current: number;
    longest: number;
    last_entry: string | null;
}

export interface Badge {
    id: number;
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    xp_reward: number;
    earned: boolean;
    earned_at: string | null;
}

export interface GamificationStatus {
    xp: XPData;
    streak: StreakData;
}

export interface LeaderboardData {
    top10: LeaderboardEntry[];
    my_rank: number | null;
    my_co2: number | null;
    week_start: string;
}

export interface LeaderboardEntry {
    rank: number;
    user_name: string;
    total_co2: number;
}

// ── Analytics ───────────────────────────────────────────────────
export interface WeeklyDayData {
    day: string;
    total: number;
    transport: number;
    energy: number;
    food: number;
    waste: number;
    water: number;
    digital: number;
    [key: string]: string | number; // dynamic category access
}

export interface TrendData {
    this_week: { total: number; avg_daily: number };
    last_week: { total: number; avg_daily: number };
    change_pct: number | null;
}

export interface BudgetData {
    budget_kg: number;
    spent_kg: number;
    remaining_kg: number;
    usage_pct: number;
    is_exceeded: boolean;
}
