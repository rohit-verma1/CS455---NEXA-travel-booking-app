from django.urls import path
from .views import ForumListCreateView, ForumPostCreateView, ForumCommentCreateView

urlpatterns = [
    path('forums/', ForumListCreateView.as_view(), name='forum-list-create'),
    path('forums/post/', ForumPostCreateView.as_view(), name='forum-post-create'),
    path('forums/comment/', ForumCommentCreateView.as_view(), name='forum-comment-create'),
]
