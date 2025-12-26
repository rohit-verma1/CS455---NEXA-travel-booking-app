"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "@/app/api";
import { Navbar as ForumNavbar } from "@/components/forum/navbar";
import HeroSection from "@/components/forum/HeroSection";
import BlogCard from "@/components/forum/BlogCard";
import BlogModal from "@/components/forum/BlogModal";
import FilterButtons from "@/components/forum/FilterButtons";
import ForumStats from "@/components/forum/ForumStats";
import ForumFilters from "@/components/forum/ForumFilters";
import NewPostModal from "@/components/forum/NewPostModal";
import NewForumModal from "@/components/forum/NewForumModal";
import ForumThreadModal from "@/components/forum/ForumThreadModal";
import { Footer } from "@/components/home/footer";
import BackToTop from "@/components/forum/BackToTop";
import { blogData } from "@/data/forum/blogData";
import { getAuthFromStorage } from "@/utils/authStorage";
import type {
  Blog,
  ForumThread,
  SortOption,
  TransportCategory,
} from "@/types/forum";

const ForumPage: React.FC = () => {
  const [activeBlogFilter, setActiveBlogFilter] = useState("all");
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>(blogData);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);

  const [forums, setForums] = useState<ForumThread[]>([]);
  const [filteredForums, setFilteredForums] = useState<ForumThread[]>([]);
  const [activeCategory, setActiveCategory] = useState<TransportCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [forumSearchQuery, setForumSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showNewForumModal, setShowNewForumModal] = useState(false);
  const [selectedForum, setSelectedForum] = useState<ForumThread | null>(null);
  const [isLoadingForums, setIsLoadingForums] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const storedAuth = getAuthFromStorage();
    setAuthToken(storedAuth?.token ?? null);
  }, []);

  const allowedServices = useMemo(
    () => new Set(["Flights", "Trains", "Buses"]),
    []
  );

  const loadForums = useCallback(async () => {
    setIsLoadingForums(true);
    setFetchError(null);

    try {
      const headers: HeadersInit = {
        accept: "application/json",
      };
      if (authToken) {
        headers.Authorization = `Token ${authToken}`;
      }

      const response = await fetch(API.FORUMS_LIST, {
        method: "GET",
        headers,
        cache: "no-store",
        credentials: "omit",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to load forums");
      }

      const data: ForumThread[] = await response.json();
      const filtered = data.filter(forum =>
        allowedServices.has(forum.service)
      );
      setForums(filtered);
    } catch (error) {
      console.error("Forum fetch error:", error);
      setFetchError("Unable to load discussions right now. Please try again.");
    } finally {
      setIsLoadingForums(false);
    }
  }, [authToken, allowedServices]);

  useEffect(() => {
    loadForums();
  }, [loadForums, refreshKey]);

  useEffect(() => {
    if (!selectedForum) return;
    const updated = forums.find(forum => forum.forum_id === selectedForum.forum_id);
    if (updated) {
      setSelectedForum(updated);
    }
  }, [forums, selectedForum?.forum_id]);

  const blogsSectionRef = useRef<HTMLDivElement>(null);
  const forumsSectionRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<"blogs" | "forums">("blogs");

  useEffect(() => {
    let results = activeBlogFilter === "all"
      ? blogData
      : blogData.filter(blog => blog.category === activeBlogFilter);

    if (blogSearchQuery) {
      const query = blogSearchQuery.toLowerCase();
      results = results.filter(
        blog =>
          blog.title.toLowerCase().includes(query) ||
          blog.station.toLowerCase().includes(query) ||
          blog.excerpt.toLowerCase().includes(query) ||
          blog.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredBlogs(results);
  }, [activeBlogFilter, blogSearchQuery]);

  useEffect(() => {
    let results = [...forums];

    if (activeCategory !== "all") {
      results = results.filter(forum =>
        forum.service?.toLowerCase() === activeCategory
      );
    }

    if (forumSearchQuery) {
      const query = forumSearchQuery.toLowerCase();
      results = results.filter(forum =>
        forum.title.toLowerCase().includes(query) ||
        (forum.description?.toLowerCase().includes(query) ?? false) ||
        forum.service?.toLowerCase().includes(query)
      );
    }

    const sorted = [...results].sort((a, b) => {
      const getCommentCount = (thread: ForumThread) =>
        thread.posts.reduce((sum, post) => sum + post.comments.length, 0);

      switch (sortBy) {
        case "popular":
          return b.posts.length - a.posts.length;
        case "comments":
          return getCommentCount(b) - getCommentCount(a);
        case "rating":
          return getCommentCount(b) - getCommentCount(a);
        case "recent":
        default:
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
      }
    });

    setFilteredForums(sorted);
  }, [forums, activeCategory, sortBy, forumSearchQuery]);

  useEffect(() => {
    const blogsSection = blogsSectionRef.current;
    const forumsSection = forumsSectionRef.current;
    if (!blogsSection || !forumsSection) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id === "blogs" ? "blogs" : "forums");
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(blogsSection);
    observer.observe(forumsSection);

    return () => observer.disconnect();
  }, []);

  const scrollToBlogs = useCallback(() => {
    blogsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToForums = useCallback(() => {
    forumsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleGlobalSearch = useCallback(
    (query: string) => {
      if (activeSection === "blogs") {
        setBlogSearchQuery(query);
        scrollToBlogs();
      } else {
        setForumSearchQuery(query);
        scrollToForums();
      }
    },
    [activeSection, scrollToBlogs, scrollToForums]
  );

  const handleNavigate = useCallback(
    (section: "blogs" | "forums") => {
      setActiveSection(section);
      if (section === "blogs") {
        scrollToBlogs();
      } else {
        scrollToForums();
      }
    },
    [scrollToBlogs, scrollToForums]
  );

  const handleJoinDiscussions = useCallback(() => {
    setActiveSection("forums");
    scrollToForums();
  }, [scrollToForums]);

  const openBlog = (blog: Blog) => setSelectedBlog(blog);
  const closeBlog = () => setSelectedBlog(null);

  const handleForumCreated = async (payload: {
    title: string;
    description: string;
    service: string;
  }) => {
    if (!authToken) {
      alert("Please log in before creating a forum.");
      return;
    }

    try {
      const response = await fetch(API.FORUMS_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Unable to create a forum");
      }

      setShowNewForumModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Forum create error:", error);
      alert("Failed to create forum. Please try again.");
    }
  };

  const handlePostCreated = async (payload: {
    forumId: string;
    title: string;
    content: string;
  }) => {
    if (!authToken) {
      alert("Please log in before posting in a forum.");
      return;
    }

    try {
      const response = await fetch(API.FORUM_POST_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify({
          forum: payload.forumId,
          title: payload.title,
          content: payload.content,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Unable to post");
      }

      setShowNewPostModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Post create error:", error);
      alert("Unable to submit post. Please try again.");
    }
  };

  return (
    <div className="font-legacy min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-gray-900">
      <ForumNavbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onSearch={handleGlobalSearch}
        searchValue={activeSection === "blogs" ? blogSearchQuery : forumSearchQuery}
        searchPlaceholder={
          activeSection === "blogs" ? "Search destinations..." : "Search routes..."
        }
      />

      <main>
        <HeroSection onScrollToBlogs={scrollToBlogs} onScrollToForums={handleJoinDiscussions} />

        <section
          id="blogs"
          ref={blogsSectionRef}
          className="mx-auto max-w-7xl px-4 py-16"
        >
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="font-display text-4xl font-bold text-gray-900">
              Travel Stories & Insights
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Discover authentic travel experiences, hidden gems, and expert tips from
              our community of seasoned travelers.
            </p>
          </div>

          <FilterButtons
            activeFilter={activeBlogFilter}
            onFilterChange={setActiveBlogFilter}
          />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlogs.map((blog, index) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                index={index}
                onClick={() => openBlog(blog)}
              />
            ))}
          </div>

          {filteredBlogs.length === 0 && (
            <div className="py-12 text-center text-gray-600">
              No blogs found matching your criteria.
            </div>
          )}

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveBlogFilter("all");
                setBlogSearchQuery("");
              }}
              className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Reset filters
            </button>
          </div>
        </section>

        <section
          id="forums"
          ref={forumsSectionRef}
          className="bg-gradient-to-b from-white to-slate-50 py-16"
        >
          <div className="mx-auto max-w-7xl px-4">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 p-10 text-center text-white shadow-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-100">
                Nexa Forums
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold">Route Discussions</h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg opacity-90">
                Connect with fellow travelers, share route-specific experiences, and get
                real-time advice across flights, trains, and buses.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewForumModal(true)}
                  className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  Start New Discussion
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(true)}
                  disabled={forums.length === 0}
                  className={`rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition ${
                    forums.length === 0
                      ? "opacity-70"
                      : "hover:bg-white/20"
                  }`}
                >
                  Add a Post
                </button>
              </div>
              {forums.length === 0 && (
                <p className="mt-3 text-xs text-blue-100">
                  Launch a discussion first so posts can be created.
                </p>
              )}
            </div>
          </div>
          
          <div className="mx-auto max-w-7xl px-4">
            {fetchError && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {fetchError}
              </div>
            )}

            <ForumFilters
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={forumSearchQuery}
              onSearchChange={setForumSearchQuery}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-600">
                {filteredForums.length} forum{filteredForums.length === 1 ? "" : "s"} available
              </p>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full px-3 py-1 transition ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-full px-3 py-1 transition ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            <div className="mt-10 space-y-6">
              {isLoadingForums ? (
                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm font-semibold text-slate-500 shadow-inner">
                  Loading discussions…
                </div>
              ) : filteredForums.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500 shadow-inner">
                  No forums match your criteria. Try expanding the filters or start a new discussion.
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredForums.map(forum => (
                    <button
                      key={forum.forum_id}
                      type="button"
                      onClick={() => setSelectedForum(forum)}
                      className="text-left"
                    >
                      <div className="relative h-full rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.2)]">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <span>{forum.service}</span>
                          <span>{forum.posts.length} posts</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-slate-900">{forum.title}</h3>
                        <p className="mt-3 text-sm text-slate-600">
                          {forum.description || "No description provided yet."}
                        </p>
                        <p className="mt-5 text-xs text-slate-400">
                          Started on {forum.created_at ? new Date(forum.created_at).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredForums.map(forum => (
                    <button
                      key={forum.forum_id}
                      type="button"
                      onClick={() => setSelectedForum(forum)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-col rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.2)]">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <span>{forum.service}</span>
                          <span>{forum.posts.length} posts</span>
                        </div>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900">{forum.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {forum.description || "No description provided yet."}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span>
                            Started on{" "}
                            {forum.created_at
                              ? new Date(forum.created_at).toLocaleDateString()
                              : "Unknown date"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-12 text-center">
              <button
                type="button"
                className="rounded-lg border-2 border-blue-600 px-8 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
                onClick={() => {
                  setForumSearchQuery("");
                  setActiveCategory("all");
                  setSortBy("recent");
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
        </section>
      </main>

      <BackToTop />

      {selectedBlog && <BlogModal blog={selectedBlog} onClose={closeBlog} />}
      {showNewForumModal && (
        <NewForumModal onClose={() => setShowNewForumModal(false)} onCreate={handleForumCreated} />
      )}
      {showNewPostModal && (
        <NewPostModal
          onClose={() => setShowNewPostModal(false)}
          onSubmit={handlePostCreated}
          forums={forums}
          defaultForumId={selectedForum?.forum_id}
        />
      )}
      {selectedForum && (
        <ForumThreadModal
          forum={selectedForum}
          onClose={() => setSelectedForum(null)}
          authToken={authToken}
          onCommentAdded={() => setRefreshKey(prev => prev + 1)}
          onRequestNewPost={() => setShowNewPostModal(true)}
        />
      )}
      <Footer />
    </div>
  );
};

export default ForumPage;
