/*******************************************************
 *  CLEANUP UPLOADS — VERSION PRO, STABLE ET SÉCURISÉE *
 *******************************************************/
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* =====================================================
   🟦 1) Connexion MongoDB (Sécurisée + Timeout propre)
   ===================================================== */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 7000,
    });
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ ERREUR CONNEXION MONGO — Abandon du nettoyage");
    console.error(err.message);
    process.exit(0); // Ne pas faire planter PM2 !
  }
}

/* =====================================================
   🟩 2) Modèle Post minimal (évite bugs)
   ===================================================== */
const Post = mongoose.model(
  "Post",
  new mongoose.Schema(
    {
      media: [
        {
          url: String,
          type: String,
        },
      ],
    },
    { strict: false }
  )
);

/* =====================================================
   🟧 3) Fonction principale
   ===================================================== */
async function cleanup() {
  const uploadDir = path.join(__dirname, "uploads");

  if (!fs.existsSync(uploadDir)) {
    console.log("⚠️ Aucun dossier uploads — rien à nettoyer.");
    process.exit(0);
  }

  console.log("📁 Lecture du dossier uploads…");

  const allFiles = fs.readdirSync(uploadDir);
  const usedFiles = new Set();

  /* -------------------------------------------
     🔍 Récupérer tous les fichiers utilisés
  ------------------------------------------- */
  const posts = await Post.find().lean();

  posts.forEach((post) => {
    if (Array.isArray(post.media)) {
      post.media.forEach((m) => {
        if (m.url) {
          const fileName = m.url.replace("/uploads/", "").trim();
          usedFiles.add(fileName);

          // thumbnail éventuel
          const ext = path.extname(fileName);
          const base = fileName.replace(ext, "");
          usedFiles.add(base + "_thumb" + ext);
        }
      });
    }
  });

  console.log("📌 Fichiers utilisés :", usedFiles.size);

  /* -------------------------------------------
     🗑️ Suppression des fichiers orphelins
  ------------------------------------------- */
  let deleted = 0;

  for (const file of allFiles) {
    if (!usedFiles.has(file)) {
      const fullPath = path.join(uploadDir, file);
      try {
        fs.unlinkSync(fullPath);
        deleted++;
        console.log("🗑️ Supprimé :", file);
      } catch (err) {
        console.error("❌ Erreur suppression", file, err.message);
      }
    }
  }

  console.log(`✨ Nettoyage terminé. ${deleted} fichier(s) supprimé(s).`);
  process.exit(0);
}

/* =====================================================
   🟨 4) Exécution
   ===================================================== */
(async () => {
  await connectDB();
  await cleanup();
})();