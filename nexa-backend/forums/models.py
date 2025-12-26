import uuid
from django.db import models
from django.conf import settings
from services.models import Station, Route

User = settings.AUTH_USER_MODEL


class TravelBlog(models.Model):
    """
    Represents a blog or review post related to a travel route or service.
    """
    BLOG_TYPE_CHOICES = [
        ('Blog', 'Blog'),
        ('Guide', 'Guide'),
        ('FAQ', 'FAQ'),
        ('Tip', 'Travel Tip'),
    ]

    blog_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    type = models.CharField(max_length=20, choices=BLOG_TYPE_CHOICES, default='Blog')

    # Relations
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='blogs_created'
    )
    route = models.ForeignKey(
        Route, on_delete=models.SET_NULL, null=True, blank=True, related_name='blogs'
    )
    station = models.ForeignKey(
        Station, on_delete=models.SET_NULL, null=True, blank=True, related_name='blogs'
    )

    # Meta fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_ai_generated = models.BooleanField(default=False)

    # Display metrics
    tags = models.CharField(max_length=250, blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)  # 4.5/5 etc.
    views = models.PositiveIntegerField(default=0)
    likes = models.ManyToManyField(User, blank=True, related_name='liked_blogs')

    def like_count(self):
        return self.likes.count()

    def comment_count(self):
        return self.comments.count()

    def __str__(self):
        return f"{self.title} ({self.type})"

    class Meta:
        ordering = ['-created_at']


class BlogComment(models.Model):
    """
    Supports threaded/nested comments for each blog.
    """
    comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blog = models.ForeignKey(
        TravelBlog, on_delete=models.CASCADE, related_name='comments'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='blog_comments'
    )
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name='liked_comments')

    def like_count(self):
        return self.likes.count()

    def reply_count(self):
        return self.replies.count()

    def __str__(self):
        return f"Comment by {self.user} on {self.blog.title}"


class BlogView(models.Model):
    """
    Optional model to track unique blog views (for analytics).
    """
    view_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blog = models.ForeignKey(TravelBlog, on_delete=models.CASCADE, related_name='view_records')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        unique_together = ('blog', 'user', 'ip_address')


class Forum(models.Model):
    """
    Discussion forum for each route or service.
    """
    forum_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    service = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Forum: {self.title}"


class ForumPost(models.Model):
    post_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE, related_name='posts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_posts')
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, blank=True, related_name='liked_forum_posts')

    def like_count(self):
        return self.likes.count()

    def comment_count(self):
        return self.comments.count()

    def __str__(self):
        return f"{self.title} by {self.user}"


class ForumComment(models.Model):
    comment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name='liked_forum_comments')

    def like_count(self):
        return self.likes.count()

    def __str__(self):
        return f"Comment by {self.user} on {self.post.title}"
