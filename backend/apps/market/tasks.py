"""
Market periyodik görevler.
GCC kredi dağıtımı ve akıllı sözleşme yönetimi.
"""
import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from django.db.models import Avg, Sum
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def distribute_daily_credits():
    """
    Her gece: Günlük hedefini tutturan kullanıcılara GCC kredisi ver.
    Formül: tasarruf edilen CO2 (kg) × 1.0 GCC
    """
    from apps.analytics.models import DailyEmissionSummary
    from apps.market.models import CarbonCredit, CreditTransaction

    today = date.today()
    summaries = DailyEmissionSummary.objects.filter(
        date=today,
        goal_achieved=True,
    ).select_related('user')

    distributed = 0
    for summary in summaries:
        saved_co2 = float(summary.daily_goal) - float(summary.total_co2)
        if saved_co2 <= 0:
            continue

        gcc_amount = Decimal(str(round(saved_co2, 4)))

        wallet, _ = CarbonCredit.objects.get_or_create(user=summary.user)
        wallet.balance += gcc_amount
        wallet.total_earned += gcc_amount
        wallet.save()

        CreditTransaction.objects.create(
            wallet=wallet,
            type='earn',
            amount=gcc_amount,
            balance_after=wallet.balance,
            description=f'{today} günlük hedef başarısı: {saved_co2:.2f} kg CO₂ tasarruf',
        )
        distributed += 1

    logger.info(f'GCC dağıtımı: {distributed} kullanıcıya kredi verildi.')
    return {'distributed': distributed, 'date': str(today)}


@shared_task
def activate_contracts():
    """
    Her gün: start_date'i bugün olan 'open' sözleşmeleri 'active' yap.
    Minimum 2 katılımcı yoksa iptal et.
    """
    from apps.market.models import SmartContract

    today = date.today()
    contracts = SmartContract.objects.filter(
        status='open',
        start_date__lte=today,
    )

    activated = 0
    cancelled = 0
    for contract in contracts:
        if contract.participants.count() >= 2:
            contract.status = 'active'
            contract.save()
            activated += 1
        else:
            contract.status = 'cancelled'
            contract.save()
            cancelled += 1

    logger.info(f'Sözleşme aktivasyonu: {activated} aktif, {cancelled} iptal.')
    return {'activated': activated, 'cancelled': cancelled}


@shared_task
def evaluate_contracts():
    """
    Her gün: end_date'i geçen 'active' sözleşmeleri değerlendir.
    Katılımcıların sözleşme süresi boyunca CO2'sini baseline ile karşılaştır.
    Hedefi tutturanlara XP ve GCC ödülü ver.
    """
    from apps.market.models import SmartContract, ContractParticipant, CarbonCredit, CreditTransaction
    from apps.analytics.models import DailyEmissionSummary
    from apps.gamification.models import UserXP

    today = date.today()
    contracts = SmartContract.objects.filter(
        status='active',
        end_date__lt=today,
    )

    for contract in contracts:
        participants = ContractParticipant.objects.filter(
            contract=contract,
        ).select_related('user')

        any_achieved = False

        for participant in participants:
            # Sözleşme süresindeki günlük ortalama × 30 = aylık CO2
            period_avg = DailyEmissionSummary.objects.filter(
                user=participant.user,
                date__range=(contract.start_date, contract.end_date),
            ).aggregate(avg=Avg('total_co2'))

            avg_daily = float(period_avg['avg'] or 0)
            monthly_co2 = avg_daily * 30
            baseline = float(participant.baseline_co2)

            if baseline > 0:
                reduction_pct = ((baseline - monthly_co2) / baseline) * 100
            else:
                reduction_pct = 0

            target_pct = float(contract.target_co2_reduction_pct)

            if reduction_pct >= target_pct:
                participant.achieved = True
                any_achieved = True

                # XP ödülü
                if not participant.reward_given:
                    xp, _ = UserXP.objects.get_or_create(user=participant.user)
                    xp.add_xp(contract.reward_per_participant, reason='other')

                    # GCC ödülü (XP ile aynı miktar)
                    gcc_amount = Decimal(str(contract.reward_per_participant))
                    wallet, _ = CarbonCredit.objects.get_or_create(user=participant.user)
                    wallet.balance += gcc_amount
                    wallet.total_earned += gcc_amount
                    wallet.save()

                    CreditTransaction.objects.create(
                        wallet=wallet,
                        type='earn',
                        amount=gcc_amount,
                        balance_after=wallet.balance,
                        description=f'Sözleşme tamamlandı: "{contract.title}" — %{reduction_pct:.1f} azaltım',
                    )

                    participant.reward_given = True

            participant.save()

        contract.status = 'completed' if any_achieved else 'failed'
        contract.save()

        logger.info(
            f'Sözleşme "{contract.title}" → {contract.status} '
            f'({sum(1 for p in participants if p.achieved)}/{participants.count()} başarılı)'
        )

    return {'evaluated': contracts.count()}
