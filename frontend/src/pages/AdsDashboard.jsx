import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ads.css";
import FBIcon from "../components/FBIcon";
import { buildPaymentLink, loadLocalCampaigns, upsertLocalCampaign } from "../utils/adsStorage";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const nav = useNavigate();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const getLocalCampaigns = () => {
    const campaigns = loadLocalCampaigns();
    return campaigns.map((c) => ({ ...c, localOnly: !c.ownerType }));
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
        id: c.id || c._id || `local-${c.createdAt || Date.now()}`,
        localOnly: !c.ownerType,
        payment: {
          ...c.payment,
          link: c.payment?.link || buildPaymentLink(c._id || c.id),
        },
      }));

      if (token) {
        const awaiting = normalizedLocal.filter(
          (c) => c._id && c.status === "awaiting_payment" && !c.payment?.emailSentAt
        );
        for (const camp of awaiting) {
          try {
            const res = await fetch(`${API_URL}/ads/${camp._id}/status`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                status: "awaiting_payment",
                review: camp.review,
                payment: { amount: camp.payment?.amount || camp.budgetTotal, currency: "FCFA" },
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.data) {
              upsertLocalCampaign(data.data);
            }
          } catch (err) {
            console.error("ADS SYNC ERROR", err);
          }
        }
      }

      const merged = new Map();
      backendCampaigns.forEach((c) => {
        const key = String(c._id);
        merged.set(key, c);
      });

      normalizedLocal.forEach((c) => {
        const key = String(c._id);
        if (merged.has(key)) {
          merged.set(key, { ...c, ...merged.get(key), localOnly: false });
        } else {
          merged.set(key, c);
        }
      });

      const mergedList = Array.from(merged.values()).sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

      setCampaigns(mergedList);
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
        const stored = loadLocalCampaigns();
        const existing = stored.find((c) => c.id === campaignId || c._id === campaignId) || { id: campaignId };
        upsertLocalCampaign({ ...existing, status });
        setCampaigns((prev) =>
          prev.map((c) => (c._id === campaignId || c.id === campaignId ? { ...c, status } : c))
        );
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
    const budgetTotal = camp.budget?.total ?? camp.budgetTotal ?? camp.payment?.amount ?? 0;
    const budgetDaily = camp.budget?.daily ?? camp.budgetDaily ?? null;
    const audienceParts = [];
    const startDate = camp.budget?.startDate || camp.startDate;
    const endDate = camp.budget?.endDate || camp.endDate;

    if (camp.audience?.country) audienceParts.push(camp.audience.country);
    if (camp.audience?.city) audienceParts.push(camp.audience.city);
    if (camp.audience?.ageMin && camp.audience?.ageMax)
      audienceParts.push(`${camp.audience.ageMin}-${camp.audience.ageMax} ans`);

    const audienceText = audienceParts.join(", ") || "Audience non renseignée";
    const campaignId = camp._id || camp.id;
    const statusLabel =
      {
        review: "En analyse",
        awaiting_payment: "Paiement requis",
        active: "Active",
        paused: "En pause",
        ended: "Terminée",
        draft: "Brouillon",
      }[status] || status;

    return (
      <div
        key={campaignId}
        className="ads-card"
        onClick={() => (isLocal ? null : nav(`/fb/ads/${campaignId}`))}
      >
        <div className="ads-meta-row">
          <span className={`ads-status-badge status-${status}`}>{statusLabel}</span>
          <span>{camp.ownerType === "page" ? "Page" : "Profil"}</span>
          <span>
            {startDate ? new Date(startDate).toLocaleDateString() : ""} →
            {" "}
            {endDate ? new Date(endDate).toLocaleDateString() : "Illimité"}
          </span>
        </div>

        <h3>{postTitle}</h3>

        <div className="ads-stats">
          <span>Budget total: {budgetTotal || 0} FCFA</span>
          <span>Quotidien: {budgetDaily || Math.ceil((budgetTotal || 0) / (camp.budget?.durationDays || 1))} FCFA</span>
          <span>Impressions: {impressions}</span>
          <span>Clics: {clicks}</span>
        </div>

        <div className="ads-subtext">Objectif : {camp.objective || "Non précisé"}</div>
        <div className="ads-subtext">Audience : {audienceText}</div>

        <div className="ads-actions">
          {status === "awaiting_payment" && (
            <button
              type="button"
              className="ads-btn primary"
              onClick={(e) => {
                e.stopPropagation();
                nav(`/fb/ads/pay/${campaignId}`);
              }}
            >
              Payer
            </button>
          )}
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
