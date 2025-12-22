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

function PostRowSkeleton() {
  return (
    <div className="ads-post-row skeleton">
      <div className="ads-post-row-body">
        <div className="ads-post-meta">
          <span className="skeleton-bar small" />
          <span className="skeleton-bar small" />
          <span className="skeleton-bar small" />
        </div>
        <div className="ads-post-text">
          <span className="skeleton-bar" />
        </div>
      </div>
      <div className="ads-btn primary disabled" aria-hidden>
        Sélectionner
      </div>
    </div>
  );
}

function ObjectiveCard({ option, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`ads-objective-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(option.value)}
    >
      <div className="ads-objective-icon" aria-hidden>
        {option.icon}
      </div>
      <div className="ads-objective-content">
        <div className="ads-objective-title">{option.title}</div>
        <div className="ads-objective-desc">{option.description}</div>
      </div>
      <div className="ads-objective-radio" aria-hidden>
        <div className="radio-circle" />
      </div>
    </button>
  );
}

const OBJECTIVE_OPTIONS = [
  {
    value: "views",
    title: "Obtenir plus de vues",
    description: "Mettre en avant votre publication auprès d'un maximum de personnes.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    value: "messages",
    title: "Recevoir plus de messages",
    description: "Encourager les utilisateurs à vous écrire directement.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
    ),
  },
  {
    value: "link",
    title: "Promouvoir un lien",
    description: "Générer du trafic vers votre site ou landing page.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 13a5 5 0 0 0 7.54.54l1.66-1.68a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-1.66 1.68a5 5 0 0 0 7.07 7.07l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: "followers",
    title: "Gagner des abonnés",
    description: "Attirer plus d'abonnés sur votre page ou profil.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="7" r="4" />
        <path d="M17 11v6" />
        <path d="m15 13 2-2 2 2" />
        <path d="M16 21H2v-2a6 6 0 0 1 6-6h1" />
      </svg>
    ),
  },
];

export default function AdsCreate() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("existing");
  const [currentStep, setCurrentStep] = useState(1);
  const [userPosts, setUserPosts] = useState([]);
  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [objective, setObjective] = useState("");

  const [newText, setNewText] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newMedia, setNewMedia] = useState([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = useMemo(() => decodeUserId(token), [token]);

  useEffect(() => {
    const storedDraftRaw = typeof window !== "undefined" ? localStorage.getItem("adsDraftV1") : null;
    if (!storedDraftRaw) return;

    try {
      const storedDraft = JSON.parse(storedDraftRaw);
      if (storedDraft?.mode === "existing" || storedDraft?.mode === "new") {
        setActiveTab(storedDraft.mode);
      }

      if (storedDraft?.postId) {
        setSavedPostId(storedDraft.postId);
      }

      if (typeof storedDraft?.text === "string") {
        setNewText(storedDraft.text);
      }

      if (typeof storedDraft?.link === "string") {
        setNewLink(storedDraft.link);
      }

      if (typeof storedDraft?.objective === "string") {
        setObjective(storedDraft.objective);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.debug("ADS draft parse error", err);
    }
  }, []);

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
        const postsEndpoint = `${API_URL}/posts/user/${userId}?includeAds=1`;
        const [userRes, pages] = await Promise.all([
          fetch(postsEndpoint, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          getMyPages(),
        ]);

        const postsData = await userRes.json();

        if (!userRes.ok) {
          const friendlyMessage =
            userRes.status === 401 || userRes.status === 403
              ? "Session expirée, reconnecte-toi"
              : userRes.status >= 500
                ? "Serveur indisponible"
                : "Impossible de charger les publications.";

          if (import.meta.env.DEV) {
            console.debug("ADS posts fetch error", userRes.status, postsEndpoint);
          }

          setError(friendlyMessage);
          setUserPosts([]);
          setPagePosts([]);
          return;
        }

        if (Array.isArray(postsData)) setUserPosts(postsData);

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
        if (import.meta.env.DEV) console.debug("ADS posts fetch exception", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [token, userId]);

  useEffect(() => {
    if (!savedPostId) return;
    const fromPages = pagePosts.flatMap((p) => p.posts || []);
    const allPosts = [...userPosts, ...fromPages];
    const found = allPosts.find((p) => p?._id === savedPostId);
    if (found) setSelectedPost(found);
  }, [pagePosts, savedPostId, userPosts]);

  useEffect(() => () => newMedia.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)), [newMedia]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const withPreview = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewMedia(withPreview);
  };

  const paginatedUserPosts = userPosts.slice(0, POSTS_PER_PAGE);
  const canProceedToStep2 =
    activeTab === "existing"
      ? Boolean(selectedPost)
      : Boolean(newText.trim() || newLink.trim() || newMedia.length > 0);

  const handleContinueToStep2 = () => {
    if (!canProceedToStep2) return;
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => setCurrentStep(1);

  const saveDraft = () => {
    const baseDraft = {
      mode: activeTab,
      objective: objective || undefined,
      savedAt: new Date().toISOString(),
    };

    const draft =
      activeTab === "existing"
        ? {
            ...baseDraft,
            postId: selectedPost?._id || savedPostId || null,
            source: selectedPost?.page ? "page" : "profil",
          }
        : {
            ...baseDraft,
            text: newText,
            link: newLink,
            media: newMedia.map((m) => ({
              name: m.file?.name,
              size: m.file?.size,
              type: m.file?.type,
            })),
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
          <div className="ads-subtitle">
            {currentStep === 1
              ? "Étape 1 · Création ou sélection de la publication."
              : "Étape 2 · Choix de l'objectif de la campagne."}
          </div>
        </div>
        <div className="ads-meta-row">
          <button className="ads-btn" onClick={() => nav(-1)}>
            Retour
          </button>
        </div>
      </div>

      <div className="ads-stepper">
        <div className={`ads-step ${currentStep === 1 ? "active" : ""}`}>1. Publication</div>
        <div
          className={`ads-step ${currentStep === 2 ? "active" : canProceedToStep2 ? "" : "disabled"}`}
        >
          2. Objectif
        </div>
        <div className="ads-step disabled">3. Audience</div>
        <div className="ads-step disabled">4. Budget & durée</div>
      </div>

      {currentStep === 1 && (
        <>
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

                {loadingPosts && (
                  <div className="ads-skeleton-list">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <PostRowSkeleton key={idx} />
                    ))}
                  </div>
                )}

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
            <button className="ads-btn primary" type="button" disabled={!canProceedToStep2} onClick={handleContinueToStep2}>
              Continuer
            </button>
            {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div>
                <div className="ads-panel-title">Objectif de la campagne</div>
                <div className="ads-subtitle">Choisissez un seul objectif à la fois.</div>
              </div>
            </div>

            <div className="ads-objectives-grid">
              {OBJECTIVE_OPTIONS.map((option) => (
                <ObjectiveCard
                  key={option.value}
                  option={option}
                  isSelected={objective === option.value}
                  onSelect={(value) => setObjective(value)}
                />
              ))}
            </div>
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
                  <div className="ads-preview-author">
                    {selectedPost?.page?.name || selectedPost?.user?.name || "Votre publication"}
                  </div>
                  <div className="ads-subtitle">Sponsorisé</div>
                </div>
              </div>
              <div className="ads-preview-text">
                {selectedPost?.text || newText || "Texte de votre publicité"}
              </div>
              {(selectedPost?.media?.[0]?.url || newMedia[0]?.preview) && (
                <div
                  className="ads-preview-media"
                  style={{
                    backgroundImage: `url(${selectedPost?.media?.[0]?.url
                      ? getImageUrl(selectedPost.media[0].url)
                      : newMedia[0]?.preview || ""})`,
                  }}
                />
              )}
              {(selectedPost?.link || newLink) && (
                <a
                  className="ads-preview-link"
                  href={selectedPost?.link || newLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedPost?.link || newLink}
                </a>
              )}

              <div className="ads-objective-summary">
                Objectif :
                <strong>
                  {objective
                    ? OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.title || "—"
                    : "À choisir"}
                </strong>
              </div>
            </div>
          </div>

          <div className="ads-footer">
            <button className="ads-btn" type="button" onClick={handleBackToStep1}>
              Retour
            </button>
            <button className="ads-btn primary" type="button" onClick={saveDraft} disabled={!objective}>
              Continuer
            </button>
            {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
          </div>
        </div>
      )}
    </div>
  );
}
