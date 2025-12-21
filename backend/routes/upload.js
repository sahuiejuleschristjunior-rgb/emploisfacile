const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const uploadsDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const generateName = (extension) =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

const ensureFileCopied = async (src, dest) => {
  try {
    await fs.promises.copyFile(src, dest);
  } catch (err) {
    console.error("[upload] fallback copy failed", err);
  }
};

const processImageAsync = (file, targetPath) => {
  setImmediate(async () => {
    try {
      await sharp(file.path)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(targetPath);
    } catch (err) {
      console.error("[upload] image compression failed", err);
      await ensureFileCopied(file.path, targetPath);
    }
  });
};

const processVideoAsync = (file, targetPath, thumbnailPath) => {
  setImmediate(() => {
    ffmpeg(file.path)
      .setFfmpegPath(ffmpegPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-b:v 1200k", "-preset veryfast", "-movflags +faststart"])
      .on("error", async (err) => {
        console.error("[upload] video compression failed", err);
        await ensureFileCopied(file.path, targetPath);
      })
      .on("end", () => {
        ffmpeg(file.path)
          .setFfmpegPath(ffmpegPath)
          .screenshots({
            count: 1,
            timemarks: ["1"],
            filename: path.basename(thumbnailPath),
            folder: uploadsDir,
          })
          .on("error", (err) =>
            console.error("[upload] thumbnail generation failed", err)
          );
      })
      .save(targetPath);
  });
};

router.post("/file", upload.array("files", 10), (req, res) => {
  const urls = (req.files || []).map((file) => {
    const mime = file.mimetype || "";

    if (mime.startsWith("image/")) {
      const outputName = generateName(".webp");
      const outputPath = path.join(uploadsDir, outputName);
      processImageAsync(file, outputPath);
      return `/uploads/${outputName}`;
    }

    if (mime.startsWith("video/")) {
      const outputName = generateName(".mp4");
      const outputPath = path.join(uploadsDir, outputName);
      const thumbName = `${path.parse(outputName).name}-thumb.jpg`;
      const thumbPath = path.join(uploadsDir, thumbName);
      processVideoAsync(file, outputPath, thumbPath);
      return `/uploads/${outputName}`;
    }

    return `/uploads/${file.filename}`;
  });

  return res.json({
    success: true,
    urls,
  });
});

module.exports = router;
