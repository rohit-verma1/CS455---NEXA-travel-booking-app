export interface Blog {
  id: string;
  title: string;
  station: string;
  category: string;
  image: string;
  excerpt: string;
  readTime: string;
  tags: string[];
  content: string;
  createdAt?: string;
}

export type ForumService = "Flights" | "Trains" | "Buses" | string;

export interface ForumComment {
  comment_id: string;
  user: string;
  user_name: string;
  content: string;
  created_ago: string;
  post: string;
}

export interface ForumPost {
  post_id: string;
  forum: string;
  user: string;
  user_name: string;
  title: string;
  content: string;
  created_at: string;
  created_ago: string;
  upvotes: number;
  replies: number;
  comments: ForumComment[];
}

export interface ForumThread {
  forum_id: string;
  title: string;
  description: string;
  service: ForumService;
  created_at: string;
  posts: ForumPost[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}

export type TransportCategory = "all" | "flights" | "trains" | "buses";
export type SortOption = "recent" | "popular" | "rating" | "comments";
