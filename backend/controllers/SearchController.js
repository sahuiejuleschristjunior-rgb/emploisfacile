const User = require("../models/User");
const Post = require("../models/Post");
const Job = require("../models/Job");

exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.json({
        users: [],
        posts: [],
        jobs: []
      });
    }

    const regex = new RegExp(query, "i");

    /* ======================================================
       USERS → Recherche élargie
    ====================================================== */
    const users = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { companyName: regex }
      ]
    }).select("_id name avatar");

    /* ======================================================
       POSTS → Correction du champ (content)
    ====================================================== */
    const posts = await Post.find({
      content: regex
    })
      .limit(20)
      .populate("author", "name avatar")
      .select("_id content author createdAt");


    /* ======================================================
       JOBS
    ====================================================== */
    const jobs = await Job.find({
      title: regex
    })
      .limit(20)
      .select("_id title company");

    res.json({ users, posts, jobs });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Erreur serveur recherche" });
  }
};