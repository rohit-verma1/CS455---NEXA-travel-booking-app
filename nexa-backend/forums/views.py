from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly,AllowAny
from .models import Forum, ForumPost, ForumComment
from .serializers import ForumSerializer, ForumPostSerializer, ForumCommentSerializer


# 🧩 1. Create / List Forums
class ForumListCreateView(generics.ListCreateAPIView):
    queryset = Forum.objects.all()
    serializer_class = ForumSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


# 🧩 2. Create a New Discussion Post inside a Forum
class ForumPostCreateView(generics.CreateAPIView):
    serializer_class = ForumPostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# 🧩 3. Add Comment to a Forum Post
class ForumCommentCreateView(generics.CreateAPIView):
    serializer_class = ForumCommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
