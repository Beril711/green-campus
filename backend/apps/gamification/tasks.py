from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from datetime import date, timedelta

User = get_user_model()


@shared_task
def process_entry_rewards(user_id: int, entry_date_str: str):
    """
    Emisyon girişi sonrası:
    1. +10 XP ekle
    2. Streak güncelle
    3. Rozet kontrolü yap
    4. Günlük hedef tutturulduysa +50 XP daha ekle
    """
    from apps.gamification.models import UserXP, Streak
    from apps.emissions.models import EmissionEntry

    try:
        user      = User.objects.get(id=user_id)
        xp, _     = UserXP.objects.get_or_create(user=user)
        streak, _ = Streak.objects.get_or_create(user=user)

        entry_date = date.fromisoformat(entry_date_str)

        # 1. Temel XP
        leveled_up, new_level = xp.add_xp(10, reason='emission_entry')

        # 2. Streak
        streak.record_entry(entry_date)

        # 3. Günlük hedef kontrolü
        entries = EmissionEntry.objects.filter(user=user, date=entry_date)
        total_co2 = sum(e.co2_kg for e in entries)
        if total_co2 <= user.profile.daily_carbon_goal:
            xp.add_xp(50, reason='goal_achieved')

        # 4. Rozet kontrolü
        check_badges.delay(user_id)

    except User.DoesNotExist:
        pass


@shared_task
def check_badges(user_id: int):
    """Kullanıcı için kazanılabilir tüm rozetleri kontrol et."""
    from apps.gamification.models import Badge, UserBadge, UserXP, Streak
    from apps.emissions.models import EmissionEntry

    try:
        user          = User.objects.get(id=user_id)
        earned_ids    = set(UserBadge.objects.filter(user=user).values_list('badge_id', flat=True))
        active_badges = Badge.objects.filter(is_active=True).exclude(id__in=earned_ids)

        xp     = UserXP.objects.filter(user=user).first()
        streak = Streak.objects.filter(user=user).first()

        for badge in active_badges:
            earned = False

            if badge.trigger == 'entry_count':
                count = EmissionEntry.objects.filter(user=user).count()
                earned = count >= badge.threshold

            elif badge.trigger == 'streak_days' and streak:
                earned = streak.current_streak >= badge.threshold

            elif badge.trigger == 'first_entry':
                earned = EmissionEntry.objects.filter(user=user).exists()

            elif badge.trigger == 'co2_saved':
                from apps.analytics.models import DailyEmissionSummary
                saved_days = DailyEmissionSummary.objects.filter(user=user, goal_achieved=True).count()
                earned = saved_days >= badge.threshold

            elif badge.trigger == 'goal_achieved':
                from apps.analytics.models import DailyEmissionSummary
                goal_days = DailyEmissionSummary.objects.filter(user=user, goal_achieved=True).count()
                earned = goal_days >= badge.threshold

            elif badge.trigger == 'category_mastery':
                cat_counts = EmissionEntry.objects.filter(user=user).values(
                    'factor__category__slug'
                ).annotate(cnt=models.Count('id'))
                earned = any(c['cnt'] >= badge.threshold for c in cat_counts)

            elif badge.trigger == 'leaderboard_top':
                from apps.gamification.models import WeeklyLeaderboard
                top_count = WeeklyLeaderboard.objects.filter(
                    user=user, rank__lte=badge.threshold
                ).count()
                earned = top_count >= 1

            elif badge.trigger == 'weekly_champion':
                from apps.gamification.models import WeeklyLeaderboard
                champion_count = WeeklyLeaderboard.objects.filter(
                    user=user, rank=1
                ).count()
                earned = champion_count >= badge.threshold

            if earned:
                user_badge = UserBadge.objects.create(user=user, badge=badge)
                xp.add_xp(badge.xp_reward, reason='badge_earned')
                # Bildirim gönder
                send_badge_notification.delay(user_id, badge.id)

    except User.DoesNotExist:
        pass


@shared_task
def check_and_reset_streaks():
    """Her sabah: Dün giriş yapmayan kullanıcıların serisini sıfırla."""
    from apps.gamification.models import Streak

    yesterday = date.today() - timedelta(days=1)
    broken = Streak.objects.filter(
        current_streak__gt=0
    ).exclude(last_entry_date__gte=yesterday)

    for streak in broken:
        streak.reset()


@shared_task
def update_weekly_leaderboard():
    """Her Pazar: Haftalık liderboard hesapla ve kaydet."""
    from apps.gamification.models import WeeklyLeaderboard, UserXP
    from apps.analytics.models import DailyEmissionSummary
    from django.db.models import Sum

    today      = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=6)

    # Bu hafta emisyon girişi olan kullanıcıları rankla
    summaries = DailyEmissionSummary.objects.filter(
        date__gte=week_start, date__lte=week_end
    ).values('user').annotate(
        total_co2=Sum('total_co2')
    ).order_by('total_co2')  # Az CO2 = iyi sıralama

    for rank, item in enumerate(summaries, start=1):
        WeeklyLeaderboard.objects.update_or_create(
            user_id=item['user'], week_start=week_start,
            defaults={'total_co2': item['total_co2'], 'rank': rank}
        )
        # Top 3'e bonus XP
        if rank <= 3:
            xp = UserXP.objects.filter(user_id=item['user']).first()
            if xp:
                bonus = {1: 200, 2: 150, 3: 100}[rank]
                xp.add_xp(bonus, reason='weekly_top')


@shared_task
def send_badge_notification(user_id: int, badge_id: int):
    """Rozet kazanımı push bildirimi."""
    from apps.gamification.models import Badge
    from apps.users.tasks import send_push_notification

    try:
        user  = User.objects.get(id=user_id)
        badge = Badge.objects.get(id=badge_id)
        if user.fcm_token:
            send_push_notification.delay(
                user.fcm_token,
                title=f'{badge.icon} Yeni Rozet Kazandın!',
                body=f'"{badge.name_tr}" rozetini kazandın! +{badge.xp_reward} XP',
            )
    except (User.DoesNotExist, Badge.DoesNotExist):
        pass
