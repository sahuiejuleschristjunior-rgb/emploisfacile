import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ads.css";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadCampaign = async () => {
    try {
      const res = await fetch(`${API_URL}/ads/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) setCampaign(data?.data || data);
    } catch (err) {
      console.error("AD DETAILS ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const changeStatus = async (status) => {
    if (!status) return;
    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/ads/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) loadCampaign();
    } catch (err) {
      console.error("AD STATUS ERROR", err);
    } finally {
      setUpdating(false);
    }
  };

  const renderStats = () => {
    const impressions = campaign?.stats?.impressions || 0;
    const clicks = campaign?.stats?.clicks || 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";

    return (
      <div className="ads-detail-grid">
        <div className="ads-detail-item">
          <strong>Statut</strong>
          <span className="ads-status-badge">{campaign?.status}</span>
        </div>
        <div className="ads-detail-item">
          <strong>Impressions</strong>
          <div>{impressions}</div>
        </div>
        <div className="ads-detail-item">
          <strong>Clics</strong>
          <div>{clicks}</div>
        </div>
        <div className="ads-detail-item">
          <strong>CTR</strong>
          <div>{ctr}%</div>
        </div>
        <div className="ads-detail-item">
          <strong>Budget total</strong>
          <div>{campaign?.budgetTotal || 0}€</div>
        </div>
        <div className="ads-detail-item">
          <strong>Budget quotidien</strong>
          <div>{campaign?.budgetDaily || 0}€</div>
        </div>
      </div>
    );
  };

  const renderPostPreview = () => {
    if (!campaign?.post) return null;
    return (
      <div className="ads-post-preview">
        <h4>Publication sponsorisée</h4>
        <div className="ads-subtitle">{campaign.post.user?.name}</div>
        <p>{campaign.post.text || "(Aucun texte)"}</p>
      </div>
    );
  };

  const content = (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Détails de la campagne</div>
          <div className="ads-subtitle">Suivi des performances en temps réel.</div>
        </div>
        <button className="ads-btn" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>

      {loading || !campaign ? (
        <div className="ads-subtitle">Chargement…</div>
      ) : (
        <>
          <div className="ads-details-card">
            {renderStats()}
            <div className="ads-cta-row">
              <button
                className="ads-btn primary"
                disabled={campaign.status === "active" || updating}
                onClick={() => changeStatus("active")}
              >
                Activer
              </button>
              <button
                className="ads-btn"
                disabled={campaign.status === "paused" || updating}
                onClick={() => changeStatus("paused")}
              >
                Pause
              </button>
              <button
                className="ads-btn"
                disabled={campaign.status === "ended" || updating}
                onClick={() => changeStatus("ended")}
              >
                Terminer
              </button>
            </div>
          </div>

          {renderPostPreview()}
        </>
      )}
    </div>
  );

  return content;
}
