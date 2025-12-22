const Post = require("../models/Post");
const Page = require("../models/Page");
const SponsoredPost = require("../models/SponsoredPost");
const { isCampaignActive } = require("../utils/sponsoredFeedHelper");
const mailer = require("../utils/mailer");

function canManagePage(page, userId) {
  if (!page || !userId) return false;
  if (String(page.owner) === String(userId)) return true;
  return (page.admins || []).some((id) => String(id) === String(userId));
}

async function ensurePostOwnership(post, userId) {
  if (!post) return false;
  if (post.authorType === "page" && post.page) {
    const page = await Page.findById(post.page);
    return canManagePage(page, userId);
  }

  return String(post.user) === String(userId);
}

async function updatePostFlag(postId, value) {
  if (!postId) return;
  await Post.findByIdAndUpdate(postId, { isSponsored: value });
}

async function refreshPostFlagForCampaign(postId) {
  if (!postId) return;
  const activeCount = await SponsoredPost.countDocuments({
    post: postId,
    status: "active",
    startDate: { $lte: new Date() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: new Date() } },
    ],
  });

  await updatePostFlag(postId, activeCount > 0);
}

function sanitizeBudget(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildPaymentLink(campaignId) {
  if (!campaignId) return "";
  const base = process.env.FRONTEND_URL || "https://emploisfacile.org";
  return `${base}/fb/ads/pay/${campaignId}`;
}

async function maybeSendAwaitingPaymentEmail(campaign) {
  try {
    if (!campaign || campaign.payment?.emailSentAt) return;
    const recipient = campaign.post?.user?.email;
    const recipientName = campaign.post?.user?.name || "client";
    if (!recipient) return;

    const variables = {
      firstName: recipientName.split(" ")[0],
      objective: campaign.objective || "Non spécifié",
      audience: campaign.audience?.country || "Audience non définie",
      budget: `${campaign.budgetTotal || 0} FCFA`,
      dates:
        campaign.startDate && campaign.endDate
          ? `${new Date(campaign.startDate).toLocaleDateString()} → ${new Date(
              campaign.endDate
            ).toLocaleDateString()}`
          : "Dates non définies",
      paymentLink: campaign.payment?.link || buildPaymentLink(campaign._id),
    };

    await mailer.sendTemplateEmail(
      "ads_payment_ready.html",
      recipient,
      "Votre publicité est prête — Paiement requis",
      variables,
      "noreply"
    );

    campaign.payment.emailSentAt = new Date();
    await campaign.save();
  } catch (err) {
    console.error("ADS PAYMENT EMAIL ERROR", err.message || err);
  }
}

exports.create = async (req, res) => {
  try {
    const { postId } = req.params;
    const body = req.body || {};
    const allowedStatus = ["draft", "review", "awaiting_payment", "active", "paused", "ended"];

    const post = await Post.findById(postId).populate("user");
    if (!post) return res.status(404).json({ ok: false, error: "Post introuvable" });

    const canSponsor = await ensurePostOwnership(post, req.userId);
    if (!canSponsor) {
      return res.status(403).json({ ok: false, error: "Accès refusé" });
    }

    const status = allowedStatus.includes(body.status) ? body.status : "review";
    const reviewStartedAt = normalizeDate(body.review?.startedAt) || new Date();
    const reviewEndsAt = normalizeDate(body.review?.endsAt);
    const creativePayload =
      body.creative && typeof body.creative === "object"
        ? body.creative
        : { text: "", link: "", media: [] };
    const audiencePayload = body.audience && typeof body.audience === "object" ? body.audience : {};

    const campaign = await SponsoredPost.create({
      post: post._id,
      ownerType: post.authorType === "page" ? "page" : "user",
      owner: post.authorType === "page" ? post.page : post.user,
      status,
      creative: creativePayload,
      objective: body.objective || null,
      audience: audiencePayload,
      budgetTotal: sanitizeBudget(body.budgetTotal),
      budgetDaily: sanitizeBudget(body.budgetDaily),
      startDate: normalizeDate(body.startDate) || new Date(),
      endDate: normalizeDate(body.endDate),
      targeting: body.targeting || null,
      review: {
        startedAt: reviewStartedAt,
        endsAt: reviewEndsAt,
      },
      payment: {
        amount: sanitizeBudget(body.payment?.amount || body.budgetTotal),
        currency: "FCFA",
        link: "",
        status: body.payment?.status === "paid" ? "paid" : "pending",
        emailSentAt: body.payment?.emailSentAt || null,
      },
    });

    // Inject payment link once we have the ID
    campaign.payment.link = buildPaymentLink(campaign._id);
    await campaign.save();

    if (status === "awaiting_payment") {
      await maybeSendAwaitingPaymentEmail(campaign);
    }

    if (status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(post._id, true);
    }

    res.status(201).json({ ok: true, data: campaign });
  } catch (err) {
    console.error("ADS CREATE ERROR", err.message || err);
    res.status(500).json({ ok: false, error: "Erreur création campagne" });
  }
};

exports.getMy = async (req, res) => {
  try {
    const managedPages = await Page.find({
      $or: [{ owner: req.userId }, { admins: req.userId }],
    }).select("_id");

    const pageIds = managedPages.map((p) => p._id);

    const campaigns = await SponsoredPost.find({
      $or: [
        { ownerType: "user", owner: req.userId },
        { ownerType: "page", owner: { $in: pageIds } },
      ],
    })
      .populate({ path: "post", populate: [{ path: "page", select: "name slug" }, { path: "user", select: "name" }] })
      .sort({ createdAt: -1 });

    res.json({ ok: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur chargement campagnes" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await SponsoredPost.findById(id).populate({
      path: "post",
      populate: [
        { path: "user", select: "name email avatar" },
        { path: "page", select: "name slug avatar" },
      ],
    });

    if (!campaign) return res.status(404).json({ ok: false, error: "Campagne introuvable" });

    const ownerOk = await ensurePostOwnership(campaign.post, req.userId);
    if (!ownerOk) return res.status(403).json({ ok: false, error: "Accès refusé" });

    res.json({ ok: true, data: campaign });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur chargement campagne" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review, payment } = req.body || {};
    const allowedStatus = ["draft", "review", "awaiting_payment", "active", "paused", "ended"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ ok: false, error: "Statut invalide" });
    }

    const campaign = await SponsoredPost.findById(id).populate({
      path: "post",
      populate: [{ path: "user", select: "name email" }],
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campagne introuvable" });

    const ownerOk = await ensurePostOwnership(campaign.post, req.userId);
    if (!ownerOk) return res.status(403).json({ ok: false, error: "Accès refusé" });

    const previousStatus = campaign.status;

    if (status === "review") {
      campaign.review = {
        startedAt: normalizeDate(review?.startedAt) || new Date(),
        endsAt: normalizeDate(review?.endsAt),
      };
    }

    if (status === "awaiting_payment") {
      const currentPayment = campaign.payment || {};
      campaign.payment = {
        ...currentPayment,
        amount: sanitizeBudget(payment?.amount || campaign.budgetTotal),
        currency: payment?.currency || currentPayment.currency || "FCFA",
        link: currentPayment.link || buildPaymentLink(campaign._id),
        status: "pending",
        emailSentAt: currentPayment.emailSentAt || null,
      };
      if (review?.startedAt || review?.endsAt) {
        campaign.review = {
          startedAt: normalizeDate(review?.startedAt) || campaign.review?.startedAt || new Date(),
          endsAt: normalizeDate(review?.endsAt) || campaign.review?.endsAt || null,
        };
      }
    }

    campaign.status = status;
    await campaign.save();

    if (status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(campaign.post, true);
    } else if (status === "paused" || status === "ended") {
      await refreshPostFlagForCampaign(campaign.post);
    }

    if (status === "awaiting_payment" && previousStatus !== "awaiting_payment") {
      await maybeSendAwaitingPaymentEmail(campaign);
    }

    res.json({ ok: true, data: campaign });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur mise à jour statut" });
  }
};

exports.track = async (req, res) => {
  try {
    const { sponsoredPostId, type } = req.body || {};

    if (!sponsoredPostId || !["impression", "click"].includes(type)) {
      return res.status(400).json({ ok: false, error: "Payload invalide" });
    }

    const campaign = await SponsoredPost.findById(sponsoredPostId);
    if (!campaign || !isCampaignActive(campaign)) {
      return res.status(404).json({ ok: false, error: "Campagne inactive" });
    }

    const field = type === "impression" ? "stats.impressions" : "stats.clicks";

    await SponsoredPost.updateOne({ _id: sponsoredPostId }, { $inc: { [field]: 1 } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Erreur tracking" });
  }
};
