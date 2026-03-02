"""
Rozet verilerini seed et.
Kullanım: python manage.py seed_badges
"""
from django.core.management.base import BaseCommand
from apps.gamification.models import Badge


BADGES = [
    # ── İlk Adım ────────────────────────────────
    {
        'slug': 'first-entry',
        'name': 'First Step',
        'name_tr': 'İlk Adım',
        'description': 'Record your first emission entry.',
        'description_tr': 'İlk emisyon girişini yap.',
        'icon': '🌱',
        'tier': 'bronze',
        'xp_reward': 50,
        'trigger': 'first_entry',
        'threshold': 1,
    },
    # ── Giriş Sayısı ────────────────────────────
    {
        'slug': 'entry-10',
        'name': '10 Entries',
        'name_tr': '10 Giriş',
        'description': 'Log 10 emission entries.',
        'description_tr': '10 emisyon girişi yap.',
        'icon': '📝',
        'tier': 'bronze',
        'xp_reward': 50,
        'trigger': 'entry_count',
        'threshold': 10,
    },
    {
        'slug': 'entry-50',
        'name': '50 Entries',
        'name_tr': '50 Giriş',
        'description': 'Log 50 emission entries.',
        'description_tr': '50 emisyon girişi yap.',
        'icon': '📊',
        'tier': 'silver',
        'xp_reward': 100,
        'trigger': 'entry_count',
        'threshold': 50,
    },
    {
        'slug': 'entry-100',
        'name': '100 Entries',
        'name_tr': 'Yüzüncü Adım',
        'description': 'Log 100 emission entries.',
        'description_tr': '100 emisyon girişi yap.',
        'icon': '🏅',
        'tier': 'gold',
        'xp_reward': 150,
        'trigger': 'entry_count',
        'threshold': 100,
    },
    {
        'slug': 'entry-500',
        'name': '500 Entries',
        'name_tr': 'Karbon Ustası',
        'description': 'Log 500 emission entries.',
        'description_tr': '500 emisyon girişi yap.',
        'icon': '👑',
        'tier': 'platinum',
        'xp_reward': 200,
        'trigger': 'entry_count',
        'threshold': 500,
    },
    # ── Seri (Streak) ───────────────────────────
    {
        'slug': 'streak-3',
        'name': '3-Day Streak',
        'name_tr': '3 Gün Seri',
        'description': 'Maintain a 3-day entry streak.',
        'description_tr': '3 gün üst üste giriş yap.',
        'icon': '🔥',
        'tier': 'bronze',
        'xp_reward': 50,
        'trigger': 'streak_days',
        'threshold': 3,
    },
    {
        'slug': 'streak-7',
        'name': '7-Day Streak',
        'name_tr': 'Haftalık Seri',
        'description': 'Maintain a 7-day entry streak.',
        'description_tr': '7 gün üst üste giriş yap.',
        'icon': '🔥',
        'tier': 'silver',
        'xp_reward': 100,
        'trigger': 'streak_days',
        'threshold': 7,
    },
    {
        'slug': 'streak-30',
        'name': '30-Day Streak',
        'name_tr': 'Aylık Seri',
        'description': 'Maintain a 30-day entry streak.',
        'description_tr': '30 gün üst üste giriş yap.',
        'icon': '💎',
        'tier': 'gold',
        'xp_reward': 200,
        'trigger': 'streak_days',
        'threshold': 30,
    },
    # ── Hedef Tutturma ──────────────────────────
    {
        'slug': 'goal-5',
        'name': '5 Goals Achieved',
        'name_tr': '5 Hedef Başarısı',
        'description': 'Achieve your daily CO₂ goal 5 times.',
        'description_tr': 'Günlük hedefini 5 kez tuttur.',
        'icon': '🎯',
        'tier': 'bronze',
        'xp_reward': 50,
        'trigger': 'co2_saved',
        'threshold': 5,
    },
    {
        'slug': 'goal-20',
        'name': '20 Goals Achieved',
        'name_tr': '20 Hedef Başarısı',
        'description': 'Achieve your daily CO₂ goal 20 times.',
        'description_tr': 'Günlük hedefini 20 kez tuttur.',
        'icon': '🎯',
        'tier': 'silver',
        'xp_reward': 100,
        'trigger': 'co2_saved',
        'threshold': 20,
    },
    {
        'slug': 'goal-50',
        'name': '50 Goals Achieved',
        'name_tr': 'Hedef Avcısı',
        'description': 'Achieve your daily CO₂ goal 50 times.',
        'description_tr': 'Günlük hedefini 50 kez tuttur.',
        'icon': '🏆',
        'tier': 'gold',
        'xp_reward': 150,
        'trigger': 'co2_saved',
        'threshold': 50,
    },
    # ── Liderboard ──────────────────────────────
    {
        'slug': 'leaderboard-top3',
        'name': 'Top 3',
        'name_tr': 'İlk 3',
        'description': 'Finish in the top 3 of the weekly leaderboard.',
        'description_tr': 'Haftalık liderboardda ilk 3\'e gir.',
        'icon': '🥇',
        'tier': 'gold',
        'xp_reward': 150,
        'trigger': 'leaderboard_top',
        'threshold': 3,
    },
    {
        'slug': 'weekly-champion',
        'name': 'Weekly Champion',
        'name_tr': 'Haftalık Şampiyon',
        'description': 'Win the weekly leaderboard.',
        'description_tr': 'Haftalık liderboardda 1. ol.',
        'icon': '🏆',
        'tier': 'platinum',
        'xp_reward': 200,
        'trigger': 'weekly_champion',
        'threshold': 1,
    },
]


class Command(BaseCommand):
    help = 'Rozet verilerini oluştur veya güncelle'

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for data in BADGES:
            slug = data.pop('slug')
            obj, was_created = Badge.objects.update_or_create(
                slug=slug,
                defaults=data,
            )
            data['slug'] = slug  # restore for next run
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Rozetler: {created} oluşturuldu, {updated} güncellendi.')
        )
