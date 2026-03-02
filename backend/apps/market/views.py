from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from datetime import date

from .models import CarbonCredit, CreditTransaction, SmartContract, ContractParticipant
from .serializers import (
    CarbonCreditSerializer, CreditTransactionSerializer,
    SmartContractSerializer, SmartContractCreateSerializer,
    ContractParticipantSerializer,
)


# ── KARBON CÜZDEİni ──────────────────────────────────────────────────────────

class WalletView(APIView):
    """Kullanıcının GCC (Green Carbon Credit) cüzdan bakiyesi."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Karbon Cüzdanı', tags=['Market'])
    def get(self, request):
        wallet, _ = CarbonCredit.objects.get_or_create(user=request.user)
        return Response(CarbonCreditSerializer(wallet).data)


class TransactionListView(generics.ListAPIView):
    """Kullanıcının GCC işlem geçmişi."""
    serializer_class   = CreditTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        wallet, _ = CarbonCredit.objects.get_or_create(user=self.request.user)
        return CreditTransaction.objects.filter(wallet=wallet).order_by('-created_at')

    @extend_schema(summary='GCC İşlem Geçmişi', tags=['Market'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


# ── AKILLI SÖZLEŞMELER ────────────────────────────────────────────────────────

class SmartContractListCreateView(generics.ListCreateAPIView):
    """Açık sözleşmeleri listele veya yeni sözleşme oluştur."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SmartContractCreateSerializer
        return SmartContractSerializer

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'open')
        return SmartContract.objects.filter(status=status_filter).select_related('creator')

    @extend_schema(summary='Sözleşme Listesi', tags=['Market'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary='Sözleşme Oluştur', tags=['Market'])
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class SmartContractDetailView(generics.RetrieveAPIView):
    """Tek sözleşme detayı + katılımcı listesi."""
    serializer_class   = SmartContractSerializer
    permission_classes = [IsAuthenticated]
    queryset           = SmartContract.objects.all()

    @extend_schema(summary='Sözleşme Detayı', tags=['Market'])
    def get(self, request, *args, **kwargs):
        contract = self.get_object()
        data = SmartContractSerializer(contract, context={'request': request}).data
        # Katılımcıları da ekle
        participants = ContractParticipant.objects.filter(contract=contract).select_related('user')
        data['participants'] = ContractParticipantSerializer(participants, many=True).data
        return Response(data)


class JoinContractView(APIView):
    """Açık bir sözleşmeye katıl."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Sözleşmeye Katıl', tags=['Market'])
    def post(self, request, pk):
        try:
            contract = SmartContract.objects.get(pk=pk, status='open')
        except SmartContract.DoesNotExist:
            return Response({'detail': 'Sözleşme bulunamadı veya katılıma kapalı.'}, status=404)

        if contract.participants.filter(user=request.user).exists():
            return Response({'detail': 'Zaten bu sözleşmeye katılmışsınız.'}, status=400)

        if contract.participants.count() >= contract.max_participants:
            return Response({'detail': 'Sözleşme katılımcı limitine ulaştı.'}, status=400)

        # Kullanıcının mevcut aylık CO₂ ortalamasını baseline olarak kaydet
        baseline = self._get_baseline(request.user)
        ContractParticipant.objects.create(
            contract=contract,
            user=request.user,
            baseline_co2=baseline,
        )

        # Tüm yerler doluysa sözleşmeyi aktife al
        if contract.participants.count() >= contract.max_participants:
            contract.status = 'active'
            contract.save()

        return Response({'detail': f'Sözleşmeye katıldınız! Temel CO₂: {baseline:.2f} kg/ay'})

    def _get_baseline(self, user) -> float:
        """Son 30 günlük günlük ortalama × 30 = aylık tahmin."""
        from apps.analytics.models import DailyEmissionSummary
        from django.db.models import Avg
        from datetime import timedelta
        thirty_ago = date.today() - timedelta(days=30)
        result = DailyEmissionSummary.objects.filter(
            user=user, date__gte=thirty_ago
        ).aggregate(avg=Avg('total_co2'))
        avg = float(result['avg'] or 0)
        return avg * 30


class LeaveContractView(APIView):
    """Henüz başlamamış bir sözleşmeden ayrıl."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Sözleşmeden Ayrıl', tags=['Market'])
    def post(self, request, pk):
        participation = ContractParticipant.objects.filter(
            contract_id=pk,
            user=request.user,
            contract__status='open',
        ).first()

        if not participation:
            return Response({'detail': 'Aktif katılımınız bulunamadı.'}, status=404)

        participation.delete()
        return Response({'detail': 'Sözleşmeden ayrıldınız.'})
