const STORAGE_KEYS = ["adsCampaignsV1", "campaignDraftV1"];

export function buildPaymentLink(campaignId) {
  if (!campaignId) return "";
  const base =
    (typeof window !== "undefined" && window.location && window.location.origin) ||
    "https://emploisfacile.org";
  return `${base}/fb/ads/pay/${campaignId}`;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeCampaignShape(campaign) {
  if (!campaign) return null;
  const id = campaign._id || campaign.id || `local-${campaign.createdAt || Date.now()}`;
  const now = Date.now();
  const reviewEnds = campaign.review?.endsAt
    ? new Date(campaign.review.endsAt).getTime()
    : campaign.analysisEndsAt || null;

  const status =
    campaign.status === "review" && reviewEnds && now >= reviewEnds
      ? "awaiting_payment"
      : campaign.status || "draft";

  const review = {
    startedAt: normalizeDate(campaign.review?.startedAt) || normalizeDate(campaign.analysisStartedAt),
    endsAt: normalizeDate(campaign.review?.endsAt) || (campaign.analysisEndsAt ? new Date(campaign.analysisEndsAt).toISOString() : null),
  };

  const payment = {
    amount: typeof campaign.payment?.amount === "number" ? campaign.payment.amount : campaign.budgetTotal || 0,
    currency: campaign.payment?.currency || "FCFA",
    link: campaign.payment?.link || buildPaymentLink(id),
    status: campaign.payment?.status || "pending",
    emailSentAt: normalizeDate(campaign.payment?.emailSentAt),
  };

  return {
    ...campaign,
    id,
    _id: campaign._id || id,
    status,
    review,
    payment,
    createdAt: campaign.createdAt || new Date().toISOString(),
  };
}

export function loadLocalCampaigns() {
  if (typeof window === "undefined") return [];
  const aggregated = [];

  STORAGE_KEYS.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) aggregated.push(...parsed);
    } catch (err) {
      console.error("ADS STORAGE LOAD ERROR", err);
    }
  });

  const normalized = aggregated
    .map((c) => normalizeCampaignShape(c))
    .filter(Boolean);

  try {
    localStorage.setItem("adsCampaignsV1", JSON.stringify(normalized));
  } catch (err) {
    // ignore quota errors
  }

  return normalized;
}

export function saveLocalCampaigns(campaigns) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("adsCampaignsV1", JSON.stringify(campaigns));
  } catch (err) {
    console.error("ADS STORAGE SAVE ERROR", err);
  }
}

export function upsertLocalCampaign(campaign) {
  if (!campaign || typeof window === "undefined") return [];
  const all = loadLocalCampaigns();
  const normalized = normalizeCampaignShape(campaign);
  if (!normalized) return all;

  const idx = all.findIndex((c) => c.id === normalized.id || c._id === normalized.id || c._id === normalized._id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...normalized };
  } else {
    all.push(normalized);
  }
  saveLocalCampaigns(all);
  return all;
}
