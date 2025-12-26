import logging
import uuid
from django.conf import settings
from django.utils import timezone
import google.generativeai as genai

from services.models import Station
from forums.models import TravelBlog  # ⚠️ adjust path based on your app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Gemini Blog Generator for Stations
# ---------------------------------------------------------------------
class StationBlogGenerator:
    """
    Uses Gemini API to auto-generate travel blogs for each station.
    """

    def __init__(self):
        if not getattr(settings, "GEMINI_API_KEY", None):
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    # -----------------------------------------------------------------
    def generate_blog_for_station(self, station, tags=None):
        """
        Generate a blog title + content for one station.
        """
        prompt = f"""
        Write a travel blog article about the station "{station.name}" located in
        {station.city or "an unknown city"}, {station.state or "India"}.
        Include details like:
        - The station's importance and atmosphere
        - Local attractions, culture, and what travelers can explore nearby
        - Transport connectivity (bus/train context)
        - Traveler tips for visitors
        - Historical or interesting facts if any
        Use a friendly, travel-blog style tone with clear paragraphs.

        Respond in this JSON format:
        {{
            "title": "A perfect blog title",
            "content": "Full engaging blog content"
        }}
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Try parsing JSON manually
            import json
            try:
                blog_data = json.loads(text)
            except json.JSONDecodeError:
                # fallback: first line = title, rest = content
                lines = text.split("\n", 1)
                blog_data = {
                    "title": lines[0].strip() if lines else f"Travel Blog about {station.name}",
                    "content": lines[1].strip() if len(lines) > 1 else text,
                }

            return {
                "title": blog_data.get("title", f"Travel Blog about {station.name}"),
                "content": blog_data.get("content", "No content generated."),
                "tags": tags or "Travel, Station, India",
            }

        except Exception as e:
            logger.error(f"Error generating blog for {station.name}: {e}")
            return None

    # -----------------------------------------------------------------
    def create_blog_entry(self, station, tags=None, created_by=None):
        """
        Create or update a TravelBlog entry for the given station.
        """
        blog_data = self.generate_blog_for_station(station, tags=tags)
        if not blog_data:
            return None

        blog = TravelBlog.objects.create(
            blog_id=uuid.uuid4(),
            title=blog_data["title"],
            content=blog_data["content"],
            type="Blog",
            created_by=created_by,
            created_at=timezone.now(),
            station=station,
            route=None,
            is_ai_generated=True,
            tags=blog_data["tags"],
        )
        logger.info(f"Created blog for station: {station.name} → {blog.blog_id}")
        return blog

    # -----------------------------------------------------------------
    def generate_blogs_for_all_stations(self, tags=None, limit=None, created_by=None):
        """
        Generate and store blogs for all stations in the DB.
        """
        qs = Station.objects.all()
        if limit:
            qs = qs[:limit]

        created_blogs = []
        for station in qs:
            blog = self.create_blog_entry(station, tags=tags, created_by=created_by)
            if blog:
                created_blogs.append(blog)

        logger.info(f"Generated {len(created_blogs)} station blogs.")
        return created_blogs
# ---------------------------------------------------------------------
