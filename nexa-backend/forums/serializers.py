from rest_framework import serializers
from .models import Forum, ForumPost, ForumComment
from django.utils.timesince import timesince
from django.utils.timezone import now


class ForumCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    created_ago = serializers.SerializerMethodField()

    class Meta:
        model = ForumComment
        fields = ['comment_id', 'user', 'user_name', 'content', 'created_ago', 'post']
        read_only_fields = ['comment_id', 'user', 'created_ago']

    def get_created_ago(self, obj):
        return f"{timesince(obj.created_at, now())} ago"


class ForumPostSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    comments = ForumCommentSerializer(many=True, read_only=True)
    upvotes = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    created_ago = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = [
            'post_id', 'forum', 'user', 'user_name', 'title', 'content',
            'created_at', 'created_ago', 'upvotes', 'replies', 'comments'
        ]
        read_only_fields = ['post_id', 'user', 'upvotes', 'replies', 'comments', 'created_ago']

    def get_upvotes(self, obj):
        return obj.likes.count()

    def get_replies(self, obj):
        return obj.comments.count()

    def get_created_ago(self, obj):
        return f"{timesince(obj.created_at, now())} ago"


class ForumSerializer(serializers.ModelSerializer):
    posts = ForumPostSerializer(many=True, read_only=True)

    class Meta:
        model = Forum
        fields = ['forum_id', 'title', 'description', 'service', 'created_at', 'posts']
        read_only_fields = ['forum_id', 'created_at']
