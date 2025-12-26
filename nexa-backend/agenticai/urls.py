from django.urls import path
from . import views

app_name = "agenticai"  # ✅ Add this line

urlpatterns = [
    path("agent-query/", views.AgentQueryView.as_view(), name="agent_query"),
    path("trip-planner/", views.TripPlannerView.as_view(), name="trip_planner"),
    path("smart-filter-llm/", views.SmartFilterLLMView.as_view(), name="smart_filter_llm"),
]
