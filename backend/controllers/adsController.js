const Post = require("../models/Post");
const Page = require("../models/Page");
const SponsoredPost = require("../models/SponsoredPost");
const { isCampaignActive } = require("../utils/sponsoredFeedHelper");

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

exports.create = async (req, res) => {
  try {
    const { postId } = req.params;
    const body = req.body || {};
    const allowedStatus = ["draft", "active", "paused", "ended"];

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ ok: false, error: "Post introuvable" });

    const canSponsor = await ensurePostOwnership(post, req.userId);
    if (!canSponsor) {
      return res.status(403).json({ ok: false, error: "Accès refusé" });
    }

    const status = allowedStatus.includes(body.status) ? body.status : "draft";

    const campaign = await SponsoredPost.create({
      post: post._id,
      ownerType: post.authorType === "page" ? "page" : "user",
      owner: post.authorType === "page" ? post.page : post.user,
      status,
      budgetTotal: Number(body.budgetTotal) || 0,
      budgetDaily: Number(body.budgetDaily) || 0,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      targeting: body.targeting || null,
    });

    if (status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(post._id, true);
    }

    res.status(201).json({ ok: true, data: campaign });
  } catch (err) {
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
    const { status } = req.body || {};
    const allowedStatus = ["draft", "active", "paused", "ended"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ ok: false, error: "Statut invalide" });
    }

    const campaign = await SponsoredPost.findById(id).populate("post");
    if (!campaign) return res.status(404).json({ ok: false, error: "Campagne introuvable" });

    const ownerOk = await ensurePostOwnership(campaign.post, req.userId);
    if (!ownerOk) return res.status(403).json({ ok: false, error: "Accès refusé" });

    campaign.status = status;
    await campaign.save();

    if (status === "active" && isCampaignActive(campaign)) {
      await updatePostFlag(campaign.post, true);
    } else if (status === "paused" || status === "ended") {
      await refreshPostFlagForCampaign(campaign.post);
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
