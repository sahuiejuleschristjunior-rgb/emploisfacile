import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ads.css";
import FBIcon from "../components/FBIcon";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const nav = useNavigate();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/ads/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setCampaigns(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("ADS LOAD ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const changeStatus = async (campaignId, status, e) => {
    e?.stopPropagation();
    if (!campaignId || !status) return;

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
    const postTitle = camp.post?.text?.slice(0, 80) || "Publication sponsorisée";
    const impressions = camp.stats?.impressions || 0;
    const clicks = camp.stats?.clicks || 0;

    return (
      <div
        key={camp._id}
        className="ads-card"
        onClick={() => nav(`/fb/ads/${camp._id}`)}
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
          <span>Budget total: {camp.budgetTotal || 0}€</span>
          <span>Quotidien: {camp.budgetDaily || 0}€</span>
          <span>Impressions: {impressions}</span>
          <span>Clics: {clicks}</span>
        </div>

        <div className="ads-actions">
          <button
            type="button"
            className="ads-btn primary"
            disabled={status === "active" || updating}
            onClick={(e) => changeStatus(camp._id, "active", e)}
          >
            Activer
          </button>
          <button
            type="button"
            className="ads-btn"
            disabled={status === "paused" || updating}
            onClick={(e) => changeStatus(camp._id, "paused", e)}
          >
            Pause
          </button>
          <button
            type="button"
            className="ads-btn"
            disabled={status === "ended" || updating}
            onClick={(e) => changeStatus(camp._id, "ended", e)}
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
