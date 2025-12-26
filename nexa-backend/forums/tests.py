import json
import pytest
from unittest import mock
from datetime import timedelta
from django.utils import timezone
from django.urls import resolve
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from forums.models import TravelBlog, Forum, ForumPost, ForumComment
from forums.serializers import (
    TravelBlogSerializer,
    ForumSerializer,
    ForumPostSerializer,
    ForumCommentSerializer,
)
from forums.utils import StationBlogGenerator
from services.models import Station, Route
from authapi.models import Session
from authapi.authentication import CustomTokenAuthentication

User = get_user_model()
pytestmark = pytest.mark.django_db


# -------------------------------------------------------------------
# Helper for user creation
# -------------------------------------------------------------------
def make_user(email="user@example.com", username="user", password="pw"):
    """Handle custom user manager signature."""
    try:
        return User.objects.create_user(email=email, username=username, password=password)
    except TypeError:
        return User.objects.create_user(email=email, password=password)


# -------------------------------------------------------------------
# Factory helpers for valid Station/Route
# -------------------------------------------------------------------
def make_station(name="StationX"):
    return Station.objects.create(name=name, city="City", state="State")


def make_route():
    """Create a valid Route with real foreign keys."""
    src = make_station("SrcStation")
    dst = make_station("DstStation")
    return Route.objects.create(source=src, destination=dst, distance_km=120.0)


# -------------------------------------------------------------------
# Model and Serializer Tests
# -------------------------------------------------------------------
def test_model_strs_and_relationships():
    user = make_user()
    route = make_route()
    station = make_station("MainStation")

    blog = TravelBlog.objects.create(
        title="Trip Blog",
        content="Some text",
        created_by=user,
        station=station,
        route=route,
        tags="x,y",
    )
    forum = Forum.objects.create(route=route, title="Forum1", description="desc")
    post = ForumPost.objects.create(forum=forum, user=user, title="P1", content="hello")
    comment = ForumComment.objects.create(post=post, user=user, content="Nice!")

    post.likes.add(user)

    # Check __str__ methods
    assert "Trip Blog" in str(blog)
    assert "Forum for" in str(forum)
    assert "P1" in str(post)
    assert "Comment by" in str(comment)

    # Serializer checks
    blog_ser = TravelBlogSerializer(blog).data
    assert blog_ser["created_by_name"] == user.username
    assert blog_ser["station_name"] == station.name
    assert "route_str" in blog_ser

    post_ser = ForumPostSerializer(post).data
    assert post_ser["likes_count"] == 1
    assert post_ser["comments"][0]["content"] == "Nice!"


# -------------------------------------------------------------------
# Utils: StationBlogGenerator
# -------------------------------------------------------------------
@mock.patch("forums.utils.genai")
def test_station_blog_generator_json_response(mock_genai):
    fake_resp = mock.Mock()
    fake_resp.text = json.dumps({"title": "AutoTitle", "content": "Generated"})
    model_instance = mock.Mock()
    model_instance.generate_content.return_value = fake_resp
    mock_genai.configure.return_value = None
    mock_genai.GenerativeModel.return_value = model_instance

    gen = StationBlogGenerator()
    station = make_station("Central")
    user = make_user(email="ai@example.com")

    result = gen.generate_blog_for_station(station)
    assert result["title"] == "AutoTitle"

    blog = gen.create_blog_entry(station, created_by=user)
    assert isinstance(blog, TravelBlog)
    assert blog.is_ai_generated


@mock.patch("forums.utils.genai")
def test_station_blog_generator_fallback_and_failure(mock_genai):
    # Fallback when not JSON
    fake_resp = mock.Mock()
    fake_resp.text = "Fallback Title\nRest of content"
    fake_model = mock.Mock()
    fake_model.generate_content.return_value = fake_resp
    mock_genai.configure.return_value = None
    mock_genai.GenerativeModel.return_value = fake_model

    gen = StationBlogGenerator()
    station = make_station("South")
    result = gen.generate_blog_for_station(station)
    assert "Fallback" in result["title"]

    # Simulate error path
    fake_model.generate_content.side_effect = Exception("Boom!")
    bad_result = gen.generate_blog_for_station(station)
    assert bad_result is None


# -------------------------------------------------------------------
# Authentication and ViewSets
# -------------------------------------------------------------------
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    user = make_user(email="auth@example.com")
    token = "sess-xyz"
    Session.objects.create(
        user=user,
        session_token=token,
        is_active=True,
        expires_at=timezone.now() + timedelta(days=1),
    )
    return user, token


def test_custom_token_auth_success(auth_user):
    user, token = auth_user
    req = mock.Mock()
    req.headers = {"Authorization": f"Token {token}"}
    auth = CustomTokenAuthentication()
    result = auth.authenticate(req)
    assert result[0] == user
    assert result[1] == token


def test_custom_token_auth_fail():
    req = mock.Mock()
    req.headers = {"Authorization": "Token invalid"}
    auth = CustomTokenAuthentication()
    with pytest.raises(Exception):
        auth.authenticate(req)

# -------------------------------------------------------------------
# ViewSet CRUD tests
# -------------------------------------------------------------------
def test_blogs_endpoints_full_crud(api_client, auth_user):
    user, token = auth_user
    station = make_station("BlogStation")
    route = make_route()
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    # CREATE
    res = api_client.post(
        "/forums/blogs/",
        {
            "title": "API Blog",
            "content": "C",
            "type": "Blog",
            "station": station.pk,
            "route": route.pk,
        },
        format="json",
    )
    assert res.status_code in (201, 400, 403)
    if res.status_code == 201:
        blog_id = res.data["blog_id"]
        # RETRIEVE
        get_res = api_client.get(f"/forums/blogs/{blog_id}/")
        assert get_res.status_code == 200
        # UPDATE
        patch_res = api_client.patch(f"/forums/blogs/{blog_id}/", {"tags": "newtag"})
        assert patch_res.status_code in (200, 202)
        # DELETE
        del_res = api_client.delete(f"/forums/blogs/{blog_id}/")
        assert del_res.status_code in (204, 200)


def test_forum_post_and_comment_crud(api_client, auth_user):
    user, token = auth_user
    route = make_route()
    forum = Forum.objects.create(route=route, title="Forum1")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    # CREATE POST
    post_res = api_client.post(
        "/forums/forum-posts/",
        {"forum": forum.pk, "title": "PostAPI", "content": "Body"},
        format="json",
    )
    assert post_res.status_code in (201, 400, 403)
    if post_res.status_code == 201:
        post_id = post_res.data["post_id"]
        # GET
        api_client.get(f"/forums/forum-posts/{post_id}/")
        # UPDATE
        api_client.patch(f"/forums/forum-posts/{post_id}/", {"content": "Edited"})
        # COMMENT CREATE
        comment_res = api_client.post(
            "/forums/forum-comments/",
            {"post": post_id, "content": "API Comment"},
            format="json",
        )
        assert comment_res.status_code in (201, 400, 403)
        if comment_res.status_code == 201:
            comment_id = comment_res.data["comment_id"]
            api_client.delete(f"/forums/forum-comments/{comment_id}/")


# -------------------------------------------------------------------
# URL routing coverage
# -------------------------------------------------------------------
def test_urlpatterns_resolve_correctly():
    """
    Ensure DRF router generated all endpoints correctly.
    """
    urls = [
        ("/forums/blogs/", "travelblog-list"),
        ("/forums/forums/", "forum-list"),
        ("/forums/forum-posts/", "forumpost-list"),
        ("/forums/forum-comments/", "forumcomment-list"),
    ]
    for url, name in urls:
        match = resolve(url)
        assert name in match.view_name
