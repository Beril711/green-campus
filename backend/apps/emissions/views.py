from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from .models import EmissionCategory, EmissionFactor, EmissionEntry
from .serializers import EmissionCategorySerializer, EmissionFactorSerializer, EmissionEntrySerializer


class CategoryListView(generics.ListAPIView):
    """Tüm aktif emisyon kategorilerini listele."""
    queryset         = EmissionCategory.objects.filter(is_active=True)
    serializer_class = EmissionCategorySerializer
    permission_classes = [AllowAny]

    @extend_schema(summary='Kategori Listesi', tags=['Emisyon'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class FactorListView(generics.ListAPIView):
    """Emisyon faktörlerini listele — kategori filtrelemesi destekli."""
    queryset         = EmissionFactor.objects.filter(is_active=True).select_related('category')
    serializer_class = EmissionFactorSerializer
    permission_classes = [AllowAny]
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category__slug']
    search_fields    = ['name_tr']

    @extend_schema(summary='Faktör Listesi', tags=['Emisyon'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class EmissionEntryListCreateView(generics.ListCreateAPIView):
    """Emisyon girişlerini listele ve yeni giriş ekle."""
    serializer_class   = EmissionEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['date', 'factor__category__slug']
    ordering_fields    = ['date', 'co2_kg', 'created_at']
    ordering           = ['-date', '-created_at']

    def get_queryset(self):
        return EmissionEntry.objects.filter(
            user=self.request.user
        ).select_related('factor__category').order_by('-date', '-created_at')

    @extend_schema(summary='Emisyon Girişi Listele', tags=['Emisyon'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary='Emisyon Girişi Ekle', tags=['Emisyon'])
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            # Gamification'ı arka planda çalıştır, response'u bloklamasın
            import threading
            threading.Thread(
                target=self._trigger_gamification,
                args=(request.user, dict(response.data)),
                daemon=True
            ).start()
        return response

    def _trigger_gamification(self, user, entry_data):
        """Giriş sonrası XP ve streak güncelle (arka planda)."""
        try:
            from apps.gamification.tasks import process_entry_rewards
            process_entry_rewards.delay(user.id, entry_data['date'])
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f'Gamification tetiklenemedi (Redis/Celery bağlantısı yok olabilir): {e}')


class EmissionEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Tek emisyon girişi görüntüle, güncelle veya sil."""
    serializer_class   = EmissionEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmissionEntry.objects.filter(user=self.request.user)

    @extend_schema(summary='Emisyon Girişi Detay', tags=['Emisyon'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary='Emisyon Girişi Güncelle', tags=['Emisyon'])
    def patch(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary='Emisyon Girişi Sil', tags=['Emisyon'])
    def delete(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class TodaySummaryView(APIView):
    """Bugünün emisyon özeti."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Günlük Özet', tags=['Emisyon'])
    def get(self, request):
        today   = timezone.localdate()
        entries = EmissionEntry.objects.filter(user=request.user, date=today).select_related('factor__category')

        total_co2 = sum(e.co2_kg for e in entries)
        by_category = {}
        for entry in entries:
            slug = entry.factor.category.slug
            by_category[slug] = by_category.get(slug, 0) + float(entry.co2_kg)

        goal         = request.user.profile.daily_carbon_goal
        goal_achieved = total_co2 <= goal

        return Response({
            'date':          today,
            'total_co2':     float(total_co2),
            'entry_count':   entries.count(),
            'daily_goal':    float(goal),
            'goal_achieved': goal_achieved,
            'remaining':     max(0, float(goal) - float(total_co2)),
            'by_category':   by_category,
        })
