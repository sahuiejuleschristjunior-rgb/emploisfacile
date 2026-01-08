// FacebookFeed.jsx
import StoriesFB from "../components/StoriesFB";
import CreatePostFB from "./CreatePostFB";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/facebook-feed.css";
import "../styles/post.css";
import { getImageUrl } from "../utils/imageUtils";
import { io } from "socket.io-client";
import { filterHiddenPosts } from "../utils/hiddenPosts";
import PostFeed from "./PostFeed";

/* Nouveau composant commentaires */

/* ============================================================
   CONFIG RÉACTIONS (si tu veux réactiver plus tard)
============================================================ */
const REACTION_CONFIG = {
  like: { label: "J’aime", emoji: "👍" },
  love: { label: "J’adore", emoji: "❤️" },
  care: { label: "Solidaire", emoji: "🤗" },
  haha: { label: "Haha", emoji: "😂" },
  wow: { label: "Wouah", emoji: "😮" },
  sad: { label: "Triste", emoji: "😢" },
  angry: { label: "Grrr", emoji: "😡" },
};

function getReactionSummary(reactions = []) {
  if (!reactions || reactions.length === 0) return { total: 0, types: [] };

  const counts = {};
  reactions.forEach((r) => {
    if (!r?.type) return;
    counts[r.type] = (counts[r.type] || 0) + 1;
  });

  return {
    total: reactions.length,
    types: Object.keys(counts),
  };
}

/* ICON Pouce */
const svgThumb = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
       viewBox="0 0 24 24" fill="none" stroke="#b0b3b8"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28
             a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7
             22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

export default function FacebookFeed() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const API_URL = import.meta.env.VITE_API_URL;
  const nav = useNavigate();
  const location = useLocation();

  /* EXTRACTION USER ID */
  let userId = null;
  let userRole = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.id || payload._id || payload.userId || null;
      userRole =
        payload.role || payload.userRole || payload.roleName || payload.type;
    } catch {
      userId = null;
    }
  }
  const isAdmin = (userRole || "").toLowerCase() === "admin";

  /* =================================================================
        STATES DU FEED (AUCUN COMMENTAIRE ICI)
  ================================================================= */
  const [notifPayload, setNotifPayload] = useState(null);
  const [feedToast, setFeedToast] = useState("");

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [latestJob, setLatestJob] = useState(null);

  const filterVisiblePosts = useCallback(
    (list) => filterHiddenPosts(list, userId),
    [userId]
  );

  useEffect(() => {
    setPosts((prev) => filterVisiblePosts(prev));
  }, [filterVisiblePosts]);

  const socketRef = useRef(null);
  const hasFocusedPost = useRef(false);
  const hasNotifiedMissing = useRef(false);

  useEffect(() => {
    const state = location.state;
    if (state?.fromNotification) {
      setNotifPayload({
        postId: state.focusPostId,
        commentId: state.focusCommentId,
        replyId: state.focusReplyId,
      });
      nav("/fb", { replace: true });
    }
  }, [location.key, nav]);

  useEffect(() => {
    hasFocusedPost.current = false;
    hasNotifiedMissing.current = false;
  }, [notifPayload?.postId, notifPayload?.commentId]);

  const addOptimisticPost = (post) => {
    if (!post) return;
    setPosts((prev) => filterVisiblePosts([post, ...prev]));
  };

  const applyCacheBust = (media = []) =>
    media.map((m) => {
      if (!m?.url) return m;
      if (m.url.startsWith("blob:")) return m;

      const cacheKey = Date.now();
      return {
        ...m,
        url: `${m.url}${m.url.includes("?") ? "&" : "?"}v=${cacheKey}`,
      };
    });

  const switchMediaToServer = (postId, mediaIndex, finalUrl) => {
    if (!postId || !finalUrl) return;

    setPosts((prev) =>
      filterVisiblePosts(
        prev.map((p) => {
          if (p._id !== postId || !p.media?.[mediaIndex]) return p;

          const updatedMedia = [...p.media];
          updatedMedia[mediaIndex] = {
            ...updatedMedia[mediaIndex],
            url: finalUrl,
            isLocal: false,
            previewUrl: undefined,
            serverUrl: undefined,
          };

          return { ...p, media: updatedMedia };
        })
      )
    );
  };

  const preloadServerMedia = (postId, mediaIndex, serverPath) => {
    const finalUrl = getImageUrl(serverPath);
    if (!finalUrl) return;

    const img = new Image();
    img.onload = () => switchMediaToServer(postId, mediaIndex, serverPath);
    img.onerror = () => switchMediaToServer(postId, mediaIndex, serverPath);
    img.src = finalUrl;
  };

  const mergeMediaWithPreview = (postId, incomingMedia = [], existingMedia = []) =>
    incomingMedia.map((mediaItem, idx) => {
      const existing = existingMedia[idx];
      if (existing?.isLocal && existing?.url && mediaItem?.url) {
        const serverUrl = mediaItem.url;
        const mediaWithPreview = {
          ...mediaItem,
          url: existing.url,
          previewUrl: existing.url,
          serverUrl,
          isLocal: true,
        };

        if (mediaItem.type === "image") {
          preloadServerMedia(postId, idx, serverUrl);
        } else {
          switchMediaToServer(postId, idx, serverUrl);
        }

        return mediaWithPreview;
      }

      return mediaItem;
    });

  const replaceOptimisticPost = (tempId, savedPost) => {
    if (!tempId || !savedPost) return;

    const postWithCacheBust = {
      ...savedPost,
      media: applyCacheBust(savedPost.media),
    };

    setPosts((prev) => {
      const existing = prev.find((p) => p._id === tempId);
      const mergedMedia = mergeMediaWithPreview(
        postWithCacheBust._id || savedPost._id,
        postWithCacheBust.media,
        existing?.media
      );

      const nextPost = {
        ...postWithCacheBust,
        media: mergedMedia,
      };

      const exists = prev.some((p) => p._id === tempId);
      if (!exists) return filterVisiblePosts([nextPost, ...prev]);

      return filterVisiblePosts(
        prev.map((p) => (p._id === tempId ? nextPost : p))
      );
    });
  };

  const removeOptimisticPost = (tempId) => {
    if (!tempId) return;
    setPosts((prev) => filterVisiblePosts(prev.filter((p) => p._id !== tempId)));
  };

  /* =================================================================
        LOAD POSTS
  ================================================================= */
  const loadPosts = async (pageToLoad = page, isInitial = false) => {
    try {
      if (isInitial) setLoadingInitial(true);
      else setLoadingMore(true);

      const res = await fetch(
        `${API_URL}/posts/paginated?page=${pageToLoad}&limit=${limit}&includeAds=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok || !Array.isArray(data.posts)) {
        if (isInitial) setPosts([]);
        return;
      }

      if (isInitial) setPosts(filterVisiblePosts(data.posts));
      else setPosts((prev) => filterVisiblePosts([...prev, ...data.posts]));

      setHasMore(Boolean(data.hasMore));
      setPage(pageToLoad);
    } catch (err) {
      console.error("LOAD POSTS ERROR:", err);
    } finally {
      isInitial ? setLoadingInitial(false) : setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  const loadLatestJob = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/jobs/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data?._id) return;

      setLatestJob(data);
    } catch (err) {
      console.error("LOAD LATEST JOB ERROR:", err);
    }
  }, [API_URL, token]);

  useEffect(() => {
    loadLatestJob();
  }, [loadLatestJob]);

  useEffect(() => {
    if (!notifPayload?.postId) return;
    if (!posts?.length) {
      if (!loadingInitial && !hasNotifiedMissing.current) {
        setFeedToast("Cette publication n’est plus disponible.");
        hasNotifiedMissing.current = true;
        setTimeout(() => setFeedToast(""), 3500);
      }
      return;
    }

    const el = document.getElementById(`post-${notifPayload.postId}`);
    if (!el) {
      if (!loadingInitial && !hasNotifiedMissing.current) {
        setFeedToast("Cette publication n’est plus disponible.");
        hasNotifiedMissing.current = true;
        setTimeout(() => setFeedToast(""), 3500);
      }
      return;
    }

    if (hasFocusedPost.current) return;
    hasFocusedPost.current = true;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("post-highlight");
      setTimeout(() => el.classList.remove("post-highlight"), 2500);
    });
  }, [notifPayload, posts, loadingInitial]);

  /* =================================================================
        SOCKET REALTIME
  ================================================================= */
  useEffect(() => {
    if (!token) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "https://emploisfacile.org";

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
    });

    socketRef.current = s;

    s.on("connect", () => console.log("📡 Socket connecté :", s.id));
    s.on("disconnect", (reason) => console.log("📡 Déconnecté :", reason));

    s.on("post:update", (updatedPost) => {
      if (!updatedPost?._id) return;

      setPosts((prev) =>
        filterVisiblePosts(
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        )
      );
    });

    s.on("post:new", (newPost) => {
      if (!newPost?._id || newPost.sharedBy) return;
      setPosts((prev) => filterVisiblePosts([newPost, ...prev]));
    });

    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, [token]);

  /* =================================================================
        SCROLL INFINI
  ================================================================= */
  const handleScroll = useCallback(() => {
    if (loadingMore || !hasMore) return;

    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 300
    ) {
      loadPosts(page + 1);
    }
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* =================================================================
        RENDER FEED
  ================================================================= */
  const jobPost = useMemo(() => {
    if (!latestJob?._id) return null;

    const jobText = [latestJob.title, latestJob.description]
      .filter(Boolean)
      .join("\n");

    const media = latestJob.image
      ? [
          {
            url: latestJob.image,
            type: "image",
          },
        ]
      : [];

    return {
      _id: `job-${latestJob._id}`,
      isJobPost: true,
      jobData: latestJob,
      createdAt: latestJob.createdAt || new Date().toISOString(),
      text: jobText,
      media,
      likes: [],
      comments: [],
    };
  }, [latestJob]);

  const feedPosts = useMemo(() => {
    if (!jobPost) return posts;

    const sanitizedPosts = posts.filter(
      (post) => !post?.isJobPost && post?._id !== jobPost._id
    );

    if (sanitizedPosts.length < 2) {
      return sanitizedPosts;
    }

    const insertIndex = Math.min(3, sanitizedPosts.length);
    const next = [...sanitizedPosts];
    next.splice(insertIndex, 0, jobPost);
    return next;
  }, [posts, jobPost]);

  return (
    <div className="fb-feed">
      <CreatePostFB
        onOptimisticPost={addOptimisticPost}
        onPostCreated={replaceOptimisticPost}
        onPostError={removeOptimisticPost}
      />
      <StoriesFB />

      <PostFeed
        posts={feedPosts}
        setPosts={setPosts}
        currentUserId={userId}
        currentUserRole={userRole}
        isAdmin={isAdmin}
        token={token}
        apiUrl={API_URL}
        filterPosts={filterVisiblePosts}
        context="feed"
        loadingInitial={loadingInitial}
        loadingMore={loadingMore}
        focusPostId={notifPayload?.postId}
        focusCommentId={notifPayload?.commentId}
        focusReplyId={notifPayload?.replyId}
        fromNotification={Boolean(notifPayload)}
      />

      {feedToast && <div className="fb-sponsor-toast">{feedToast}</div>}
    </div>
  );
}
