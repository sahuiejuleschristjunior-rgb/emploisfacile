import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ads.css";
import FBIcon from "../components/FBIcon";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";
const LOCAL_CAMPAIGN_KEY = "campaignDraftV1";

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const nav = useNavigate();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const getLocalCampaigns = () => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_CAMPAIGN_KEY);
      const campaigns = stored ? JSON.parse(stored) : [];
      const now = Date.now();
      const normalized = Array.isArray(campaigns)
        ? campaigns.map((c) => {
            if (c.status === "review" && c.analysisEndsAt && now >= c.analysisEndsAt) {
              return { ...c, status: "awaiting_payment", analysisFinishedAt: new Date(now).toISOString() };
            }
            return c;
          })
        : [];
      localStorage.setItem(LOCAL_CAMPAIGN_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (err) {
      console.error("ADS LOCAL CAMPAIGN ERROR", err);
      return [];
    }
  };

  const loadCampaigns = async () => {
    try {
      const local = getLocalCampaigns();
      let backendCampaigns = [];

      if (token) {
        const res = await fetch(`${API_URL}/ads/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        backendCampaigns = Array.isArray(data?.data) ? data.data : [];
      }

      const normalizedLocal = local.map((c) => ({
        ...c,
        _id: c._id || c.id || `local-${c.createdAt || Date.now()}`,
        localOnly: true,
      }));

      setCampaigns([...backendCampaigns, ...normalizedLocal]);
    } catch (err) {
      console.error("ADS LOAD ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const changeStatus = async (campaignId, status, e, isLocal = false) => {
    e?.stopPropagation();
    if (!campaignId || !status) return;

    if (isLocal) {
      try {
        const stored = getLocalCampaigns();
        const updated = stored.map((c) => (c.id === campaignId || c._id === campaignId ? { ...c, status } : c));
        localStorage.setItem(LOCAL_CAMPAIGN_KEY, JSON.stringify(updated));
        setCampaigns((prev) => prev.map((c) => (c._id === campaignId || c.id === campaignId ? { ...c, status } : c)));
      } catch (err) {
        console.error("ADS LOCAL STATUS ERROR", err);
      }
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/ads/${campaignId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        loadCampaigns();
      }
    } catch (err) {
      console.error("ADS STATUS ERROR", err);
    } finally {
      setUpdating(false);
    }
  };

    const renderCard = (camp) => {
      const status = camp.status || "draft";
      const isLocal = Boolean(camp.localOnly && !camp.ownerType);
      const postTitle = camp.post?.text?.slice(0, 80) || "Publication sponsorisée";
      const impressions = camp.stats?.impressions || 0;
      const clicks = camp.stats?.clicks || 0;
    const budgetTotal = camp.budgetTotal || 0;
    const budgetDaily = camp.budgetDaily || 0;
    const audienceParts = [];

    if (camp.audience?.country) audienceParts.push(camp.audience.country);
    if (camp.audience?.city) audienceParts.push(camp.audience.city);
    if (camp.audience?.ageMin && camp.audience?.ageMax)
      audienceParts.push(`${camp.audience.ageMin}-${camp.audience.ageMax} ans`);

    const audienceText = audienceParts.join(", ") || "Audience non renseignée";
    const campaignId = camp._id || camp.id;

    return (
      <div
        key={campaignId}
        className="ads-card"
        onClick={() => (isLocal ? null : nav(`/fb/ads/${camp._id}`))}
      >
        <div className="ads-meta-row">
          <span className="ads-status-badge">{status}</span>
          <span>{camp.ownerType === "page" ? "Page" : "Profil"}</span>
          <span>
            {camp.startDate ? new Date(camp.startDate).toLocaleDateString() : ""} →
            {" "}
            {camp.endDate ? new Date(camp.endDate).toLocaleDateString() : "Illimité"}
          </span>
        </div>

        <h3>{postTitle}</h3>

        <div className="ads-stats">
          <span>Budget total: {budgetTotal} FCFA</span>
          <span>Quotidien: {budgetDaily || "—"} FCFA</span>
          <span>Impressions: {impressions}</span>
          <span>Clics: {clicks}</span>
        </div>

        <div className="ads-subtext">Objectif : {camp.objective || "Non précisé"}</div>
        <div className="ads-subtext">Audience : {audienceText}</div>

        <div className="ads-actions">
          <button
            type="button"
            className="ads-btn primary"
            disabled={status === "active" || updating}
            onClick={(e) => changeStatus(campaignId, "active", e, isLocal)}
          >
            Activer
          </button>
          <button
            type="button"
            className="ads-btn"
            disabled={status === "paused" || updating}
            onClick={(e) => changeStatus(campaignId, "paused", e, isLocal)}
          >
            Pause
          </button>
          <button
            type="button"
            className="ads-btn"
            disabled={status === "ended" || updating}
            onClick={(e) => changeStatus(campaignId, "ended", e, isLocal)}
          >
            Terminer
          </button>
        </div>
      </div>
    );
  };

  const content = (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Centre de publicités</div>
          <div className="ads-subtitle">
            Gérez vos campagnes sponsorisées façon Facebook Ads (sans paiement).
          </div>
        </div>
        <div className="ads-meta-row">
          <FBIcon name="ads" size={22} />
          <span>{campaigns.length} campagne(s)</span>
          <button className="ads-btn primary" onClick={() => nav("/fb/ads/create")}>
            Créer une publicité
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ads-subtitle">Chargement des campagnes…</div>
      ) : campaigns.length === 0 ? (
        <div className="ads-subtitle">
          Aucune campagne pour le moment. Sponsorisez une publication pour commencer.
        </div>
      ) : (
        <div className="ads-grid">{campaigns.map((c) => renderCard(c))}</div>
      )}
    </div>
  );

  return content;
}
