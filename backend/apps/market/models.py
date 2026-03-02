from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid


class CarbonCredit(models.Model):
    """Sanal GCC (Green Carbon Credit) karbon kredisi."""

    user        = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='carbon_wallet')
    balance     = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    total_earned = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    total_spent  = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Karbon Cüzdanı'

    def __str__(self):
        return f'{self.user.get_full_name()} | {self.balance} GCC'


class CreditTransaction(models.Model):
    """GCC alım-satım işlem geçmişi."""

    TYPE_CHOICES = [
        ('earn',     'Kazanım (CO2 tasarrufundan)'),
        ('spend',    'Harcama'),
        ('transfer', 'Transfer'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet      = models.ForeignKey(CarbonCredit, on_delete=models.CASCADE, related_name='transactions')
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount      = models.DecimalField(max_digits=10, decimal_places=4)
    balance_after = models.DecimalField(max_digits=12, decimal_places=4)
    description = models.CharField(max_length=200)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        sign = '+' if self.type == 'earn' else '-'
        return f'{sign}{self.amount} GCC | {self.description}'


class SmartContract(models.Model):
    """
    Akıllı Sözleşme: Grup karbon taahhüdü.
    Katılımcılar hedefi tuturursa otomatik ödül dağıtılır.
    """
    STATUS_CHOICES = [
        ('open',      'Katılıma Açık'),
        ('active',    'Aktif'),
        ('completed', 'Tamamlandı'),
        ('failed',    'Başarısız'),
        ('cancelled', 'İptal Edildi'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_contracts')
    title       = models.CharField(max_length=100)
    description = models.TextField()

    # Sözleşme koşulları
    target_co2_reduction_pct = models.DecimalField(max_digits=5, decimal_places=2, help_text='Hedef azaltım yüzdesi')
    duration_days            = models.PositiveSmallIntegerField(default=30)
    max_participants         = models.PositiveSmallIntegerField(default=10)

    # Ödül
    reward_per_participant   = models.PositiveIntegerField(default=100, help_text='XP ödülü')

    start_date  = models.DateField()
    end_date    = models.DateField()
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Akıllı Sözleşme'
        verbose_name_plural = 'Akıllı Sözleşmeler'
        ordering            = ['-created_at']

    def __str__(self):
        return f'{self.title} | {self.get_status_display()}'


class ContractParticipant(models.Model):
    """Akıllı sözleşme katılımcısı."""

    contract       = models.ForeignKey(SmartContract, on_delete=models.CASCADE, related_name='participants')
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contract_participations')
    joined_at      = models.DateTimeField(auto_now_add=True)
    baseline_co2   = models.DecimalField(max_digits=8, decimal_places=2, help_text='Katılım anındaki aylık ortalama kg CO2')
    achieved       = models.BooleanField(default=False)
    reward_given   = models.BooleanField(default=False)

    class Meta:
        unique_together = ['contract', 'user']

    def __str__(self):
        return f'{self.user.get_full_name()} → {self.contract.title}'
