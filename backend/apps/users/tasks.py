"""
Kullanıcı bildirim görevleri.
Celery ile asenkron çalışır.
"""
import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from django.conf import settings

logger = logging.getLogger(__name__)
User   = get_user_model()


@shared_task
def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """
    Firebase Cloud Messaging ile push bildirim gönder.
    FCM_SERVER_KEY settings'de tanımlı olmalı.
    """
    if not fcm_token or not settings.FCM_SERVER_KEY:
        logger.warning('Push bildirimi atlandı: token veya FCM key eksik.')
        return {'skipped': True}

    try:
        import urllib.request
        import json

        payload = json.dumps({
            'to': fcm_token,
            'notification': {'title': title, 'body': body},
            'data': data or {},
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://fcm.googleapis.com/fcm/send',
            data=payload,
            headers={
                'Authorization': f'key={settings.FCM_SERVER_KEY}',
                'Content-Type':  'application/json',
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            logger.info(f'FCM yanıtı: {result}')
            return result

    except Exception as e:
        logger.error(f'FCM hatası: {e}')
        return {'error': str(e)}


@shared_task
def send_daily_reminders():
    """
    Her sabah 09:00 — Bugün henüz emisyon girişi yapmayan
    ve günlük bildirim açık olan kullanıcılara hatırlatma gönder.
    """
    from apps.emissions.models import EmissionEntry
    from django.utils import timezone

    today = timezone.localdate()

    # Bugün giriş yapmış kullanıcıların ID'leri
    entered_today = set(
        EmissionEntry.objects.filter(date=today)
        .values_list('user_id', flat=True)
    )

    # Giriş yapmamış, bildirimi açık kullanıcılar
    users = User.objects.filter(
        profile__notify_daily=True,
        is_active=True,
    ).exclude(id__in=entered_today).exclude(fcm_token='')

    count = 0
    for user in users:
        send_push_notification.delay(
            fcm_token=user.fcm_token,
            title='🌱 Günlük Hatırlatma',
            body='Bugünkü karbon girişini yapmayı unutma!',
            data={'type': 'daily_reminder'},
        )
        count += 1

    logger.info(f'Günlük hatırlatma: {count} kullanıcıya gönderildi.')
    return {'sent': count}


@shared_task
def send_budget_exceeded_notification(user_id: int):
    """Aylık karbon bütçesi aşıldığında bildirim gönder."""
    try:
        user = User.objects.get(id=user_id)
        if user.fcm_token and getattr(user.profile, 'notify_budget', True):
            send_push_notification.delay(
                fcm_token=user.fcm_token,
                title='⚠️ Bütçe Aşıldı',
                body='Bu ayki karbon bütçeni aştın. Aktivitelerini gözden geçir!',
                data={'type': 'budget_exceeded'},
            )
    except User.DoesNotExist:
        pass


@shared_task
def send_streak_warning(user_id: int, current_streak: int):
    """Seri kırılmak üzereyken (gece 21:00) bildirim gönder."""
    try:
        user = User.objects.get(id=user_id)
        if user.fcm_token and getattr(user.profile, 'notify_streak', True):
            send_push_notification.delay(
                fcm_token=user.fcm_token,
                title='🔥 Serin Kırılmak Üzere!',
                body=f'{current_streak} günlük serinini kaybetmemek için bugün giriş yap!',
                data={'type': 'streak_warning', 'streak': current_streak},
            )
    except User.DoesNotExist:
        pass


@shared_task
def send_streak_warnings():
    """
    Her gece 21:00 — Bugün giriş yapmamış ve aktif serisi olan
    kullanıcılara seri uyarısı gönder.
    """
    from apps.gamification.models import Streak
    from apps.emissions.models import EmissionEntry
    from django.utils import timezone

    today = timezone.localdate()

    entered_today = set(
        EmissionEntry.objects.filter(date=today)
        .values_list('user_id', flat=True)
    )

    active_streaks = Streak.objects.filter(
        current_streak__gte=3,
    ).exclude(user_id__in=entered_today).select_related('user')

    count = 0
    for streak in active_streaks:
        send_streak_warning.delay(streak.user_id, streak.current_streak)
        count += 1

    logger.info(f'Seri uyarısı: {count} kullanıcıya gönderildi.')
    return {'sent': count}


@shared_task
def send_weekly_summary_email(user_id: int):
    """
    Haftanın özet e-postasını gönder (opsiyonel).
    Her Pazar akşamı tetiklenir.
    """
    from django.core.mail import send_mail
    from apps.analytics.models import WeeklySummary
    from datetime import date, timedelta

    try:
        user       = User.objects.get(id=user_id)
        week_start = date.today() - timedelta(days=date.today().weekday())
        summary    = WeeklySummary.objects.filter(user=user, week_start=week_start).first()

        if not summary:
            return

        subject = f'🌱 Haftalık Karbon Özetin — {week_start.strftime("%d %B")}'
        message = (
            f'Merhaba {user.first_name},\n\n'
            f'Bu haftaki toplam emisyonun: {summary.total_co2:.1f} kg CO₂\n'
            f'Günlük ortalama: {summary.avg_daily:.2f} kg\n'
            f'Aktif gün: {summary.active_days}/7\n'
        )
        if summary.change_pct is not None:
            direction = 'azaldı ✅' if summary.change_pct < 0 else 'arttı ⚠️'
            message += f'Geçen haftaya göre %{abs(summary.change_pct):.1f} {direction}\n'

        message += '\nKarbon Ayak İzi uygulamasından daha fazla detay görebilirsin.'

        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        logger.info(f'Haftalık özet e-postası gönderildi: {user.email}')

    except User.DoesNotExist:
        pass
