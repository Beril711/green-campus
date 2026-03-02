import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('karbonayakizi')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── PERİYODİK GÖREVLER ───────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Her gece 23:59 günlük özet oluştur
    'create-daily-summaries': {
        'task': 'apps.analytics.tasks.create_daily_summaries',
        'schedule': crontab(hour=23, minute=59),
    },
    # Her Pazartesi haftalık özet
    'create-weekly-summaries': {
        'task': 'apps.analytics.tasks.create_weekly_summaries',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),
    },
    # Her sabah 8:00 streak kontrolü
    'check-streaks': {
        'task': 'apps.gamification.tasks.check_and_reset_streaks',
        'schedule': crontab(hour=8, minute=0),
    },
    # Her sabah 9:00 hatırlatma bildirimleri
    'send-daily-reminders': {
        'task': 'apps.users.tasks.send_daily_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
    # Her Pazar liderboard güncelle ve bildir
    'update-leaderboard': {
        'task': 'apps.gamification.tasks.update_weekly_leaderboard',
        'schedule': crontab(hour=20, minute=0, day_of_week=0),
    },
    # Her gece 00:05 — Günlük hedef tutturanlara GCC kredi dağıt
    'distribute-daily-credits': {
        'task': 'apps.market.tasks.distribute_daily_credits',
        'schedule': crontab(hour=0, minute=5),
    },
    # Her gün 06:00 — Başlama tarihi gelen sözleşmeleri aktifleştir
    'activate-contracts': {
        'task': 'apps.market.tasks.activate_contracts',
        'schedule': crontab(hour=6, minute=0),
    },
    # Her gün 06:30 — Süresi dolan sözleşmeleri değerlendir
    'evaluate-contracts': {
        'task': 'apps.market.tasks.evaluate_contracts',
        'schedule': crontab(hour=6, minute=30),
    },
    # Her gece 21:00 — Seri kırılma uyarısı gönder
    'send-streak-warnings': {
        'task': 'apps.users.tasks.send_streak_warnings',
        'schedule': crontab(hour=21, minute=0),
    },
}
