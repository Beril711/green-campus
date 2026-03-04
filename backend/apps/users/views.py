from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, UpdateProfileSerializer, FCMTokenSerializer
import logging

logger = logging.getLogger('apps.users')

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Yeni kullanıcı kaydı."""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    @extend_schema(summary='Kullanıcı Kaydı', tags=['Auth'])
    def post(self, request, *args, **kwargs):
        logger.info(f"[REGISTER] İstek geldi — data keys: {list(request.data.keys())}")
        logger.debug(f"[REGISTER] İstek detayı — email: {request.data.get('email', 'YOK')}")

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"[REGISTER] Validasyon hatası: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
            logger.info(f"[REGISTER] ✅ Kullanıcı oluşturuldu — {user.email} (id={user.id})")
        except Exception as e:
            logger.error(f"[REGISTER] ❌ Kayıt hatası: {str(e)}", exc_info=True)
            return Response({'detail': f'Kayıt sırasında hata oluştu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Kayıt sonrası token üret
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """Refresh token'ı kara listeye ekle."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Çıkış', tags=['Auth'])
    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Başarıyla çıkış yapıldı.'})
        except Exception:
            return Response({'detail': 'Geçersiz token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    """Oturum açmış kullanıcının profili."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(summary='Profil Görüntüle', tags=['Kullanıcı'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary='Profil Güncelle', tags=['Kullanıcı'])
    def patch(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)


class FCMTokenView(APIView):
    """FCM push bildirim tokenını güncelle."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='FCM Token Güncelle', tags=['Kullanıcı'])
    def post(self, request):
        serializer = FCMTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response({'detail': 'FCM token güncellendi.'})
