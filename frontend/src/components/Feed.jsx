import { useEffect, useState } from "react";
import Post from "./Post";
import PageLoader from "./PageLoader"; // ton loader existant

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadPosts() {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/posts", {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("FEED LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleHidePost = (postId) => {
    setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      {posts.length === 0 && (
        <div style={{ padding: 20, color: "white", textAlign: "center" }}>
          Aucun post disponible.
        </div>
      )}

      {posts.map((post) => (
        <Post key={post._id} post={post} refresh={loadPosts} onHidePost={handleHidePost} />
      ))}
    </div>
  );
}
