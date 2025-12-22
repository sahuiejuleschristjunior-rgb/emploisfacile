import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPages, getPagePosts } from "../api/pagesApi";
import "../styles/ads.css";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";
const POSTS_PER_PAGE = 5;

function decodeUserId(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id || payload.userId || null;
  } catch (err) {
    return null;
  }
}

function PostRow({ post, sourceLabel, onSelect, isSelected }) {
  const previewMedia = Array.isArray(post?.media) ? post.media[0] : null;
  const previewUrl = previewMedia ? getImageUrl(previewMedia.url) : null;

  return (
    <div className={`ads-post-row ${isSelected ? "selected" : ""}`}>
      <div className="ads-post-row-body">
        <div className="ads-post-meta">
          <span className="ads-source-pill">{sourceLabel}</span>
          <span className="ads-post-author">{post?.page?.name || post?.user?.name}</span>
          <span className="ads-post-date">
            {post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
          </span>
        </div>
        <div className="ads-post-text">{post?.text || "(Texte vide)"}</div>
        {previewUrl && (
          <div className="ads-post-thumb" style={{ backgroundImage: `url(${previewUrl})` }} />
        )}
      </div>
      <button type="button" className="ads-btn primary" onClick={() => onSelect(post)}>
        Sélectionner
      </button>
    </div>
  );
}

export default function AdsCreate() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("existing");
  const [userPosts, setUserPosts] = useState([]);
  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const [newText, setNewText] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newMedia, setNewMedia] = useState([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = useMemo(() => decodeUserId(token), [token]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!token || !userId) {
        setError("Connexion requise pour charger vos publications.");
        setLoadingPosts(false);
        return;
      }

      setError("");
      setLoadingPosts(true);

      try {
        const [userRes, pages] = await Promise.all([
          fetch(`${API_URL}/post/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          getMyPages(),
        ]);

        if (Array.isArray(userRes)) setUserPosts(userRes);

        const managedPages = Array.isArray(pages) ? pages : [];
        const pagesWithPosts = await Promise.all(
          managedPages.map(async (page) => {
            try {
              const res = await getPagePosts(page.slug, 1, POSTS_PER_PAGE);
              return { page, posts: Array.isArray(res.posts) ? res.posts : [] };
            } catch (err) {
              return { page, posts: [] };
            }
          })
        );

        setPagePosts(pagesWithPosts.filter((p) => p.posts.length > 0));
      } catch (err) {
        setError("Impossible de charger les publications.");
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [token, userId]);

  useEffect(() => () => newMedia.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)), [newMedia]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const withPreview = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewMedia(withPreview);
  };

  const paginatedUserPosts = userPosts.slice(0, POSTS_PER_PAGE);

  const saveDraft = () => {
    const draft =
      activeTab === "existing"
        ? {
            mode: "existing",
            postId: selectedPost?._id || null,
            source: selectedPost?.page ? "page" : "profil",
            savedAt: new Date().toISOString(),
          }
        : {
            mode: "new",
            text: newText,
            link: newLink,
            media: newMedia.map((m) => ({
              name: m.file?.name,
              size: m.file?.size,
              type: m.file?.type,
            })),
            savedAt: new Date().toISOString(),
          };

    localStorage.setItem("adsDraftV1", JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  return (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Créer une publicité</div>
          <div className="ads-subtitle">Étape 1 · Création ou sélection de la publication.</div>
        </div>
        <div className="ads-meta-row">
          <button className="ads-btn" onClick={() => nav(-1)}>
            Retour
          </button>
        </div>
      </div>

      <div className="ads-stepper">
        <div className="ads-step active">1. Publication</div>
        <div className="ads-step disabled">2. Objectif</div>
        <div className="ads-step disabled">3. Audience</div>
        <div className="ads-step disabled">4. Budget & durée</div>
      </div>

      <div className="ads-tabs">
        <button
          type="button"
          className={`ads-tab ${activeTab === "existing" ? "active" : ""}`}
          onClick={() => setActiveTab("existing")}
        >
          Utiliser une publication existante
        </button>
        <button
          type="button"
          className={`ads-tab ${activeTab === "new" ? "active" : ""}`}
          onClick={() => setActiveTab("new")}
        >
          Créer une nouvelle publication
        </button>
      </div>

      {error && <div className="ads-error">{error}</div>}

      {activeTab === "existing" ? (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div>
                <div className="ads-panel-title">Vos publications</div>
                <div className="ads-subtitle">Sélectionnez un post récent à sponsoriser.</div>
              </div>
              <span className="ads-count-pill">{userPosts.length}</span>
            </div>

            {loadingPosts && <div className="ads-subtitle">Chargement des publications…</div>}

            {!loadingPosts && paginatedUserPosts.length === 0 && (
              <div className="ads-empty">Aucune publication personnelle trouvée.</div>
            )}

            {!loadingPosts &&
              paginatedUserPosts.map((post) => (
                <PostRow
                  key={post._id}
                  post={post}
                  sourceLabel="Profil"
                  onSelect={(p) => setSelectedPost({ ...p, source: "profil" })}
                  isSelected={selectedPost?._id === post._id}
                />
              ))}

            {pagePosts.length > 0 && (
              <div className="ads-panel-title" style={{ marginTop: 16 }}>
                Publications de vos pages
              </div>
            )}

            {pagePosts.map(({ page, posts }) => (
              <div key={page._id} className="ads-page-block">
                <div className="ads-subtitle">{page.name}</div>
                {posts.map((post) => (
                  <PostRow
                    key={post._id}
                    post={post}
                    sourceLabel={page.name}
                    onSelect={(p) => setSelectedPost({ ...p, source: page.name })}
                    isSelected={selectedPost?._id === post._id}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Aperçu</div>
              {selectedPost && <span className="ads-status-badge">Sponsorisé</span>}
            </div>
            {!selectedPost && (
              <div className="ads-empty">Choisissez une publication pour voir l'aperçu.</div>
            )}

            {selectedPost && (
              <div className="ads-preview-card">
                <div className="ads-preview-header">
                  <div className="ads-avatar" />
                  <div>
                    <div className="ads-preview-author">
                      {selectedPost.page?.name || selectedPost.user?.name || "Profil"}
                    </div>
                    <div className="ads-subtitle">Sponsorisé</div>
                  </div>
                </div>
                <div className="ads-preview-text">{selectedPost.text}</div>
                {selectedPost.media?.[0]?.url && (
                  <div
                    className="ads-preview-media"
                    style={{ backgroundImage: `url(${getImageUrl(selectedPost.media[0].url)})` }}
                  />
                )}
                {selectedPost.link && (
                  <a className="ads-preview-link" href={selectedPost.link} target="_blank" rel="noreferrer">
                    {selectedPost.link}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Composer la publication</div>
              <span className="ads-count-pill">Brouillon</span>
            </div>

            <label className="ads-label">Texte</label>
            <textarea
              className="ads-textarea"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Rédigez le message de votre publicité"
              rows={4}
            />

            <label className="ads-label">Lien (optionnel)</label>
            <input
              className="ads-input"
              type="url"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://exemple.com"
            />

            <label className="ads-label">Média</label>
            <input className="ads-input" type="file" accept="image/*,video/*" onChange={handleFileChange} multiple />
            {newMedia.length > 0 && (
              <div className="ads-media-grid">
                {newMedia.map((m, idx) => (
                  <div key={idx} className="ads-media-thumb" style={{ backgroundImage: `url(${m.preview})` }} />
                ))}
              </div>
            )}
          </div>

          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Aperçu</div>
              <span className="ads-status-badge">Brouillon</span>
            </div>
            <div className="ads-preview-card">
              <div className="ads-preview-header">
                <div className="ads-avatar" />
                <div>
                  <div className="ads-preview-author">Vous</div>
                  <div className="ads-subtitle">Sponsorisé</div>
                </div>
              </div>
              <div className="ads-preview-text">{newText || "Texte de votre publicité"}</div>
              {newMedia[0]?.preview && (
                <div
                  className="ads-preview-media"
                  style={{ backgroundImage: `url(${newMedia[0].preview})` }}
                />
              )}
              {newLink && (
                <a className="ads-preview-link" href={newLink} target="_blank" rel="noreferrer">
                  {newLink}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ads-footer">
        <button className="ads-btn" type="button" onClick={saveDraft}>
          Enregistrer le brouillon
        </button>
        <button className="ads-btn" type="button" disabled>
          Étape suivante (bientôt)
        </button>
        {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
      </div>
    </div>
  );
}
