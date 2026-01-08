const Job = require('../models/Job');
const Application = require('../models/Application');

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildRegex = (value = "") => new RegExp(escapeRegex(value), "i");

/* ============================================================
   POST /api/jobs
   ➤ Créer une nouvelle offre (Recruteur)
============================================================ */
exports.createJob = async (req, res) => {
    try {
        const recruiter = req.user.id;

        const {
            title,
            description,
            location,
            contractType,
            salaryRange,
            workMode,
            experienceLevel,
            responsibilities,
            profile,
            benefits,
            recruitmentProcess,
            media
        } = req.body;

        const normalizeList = (value) => {
            if (Array.isArray(value)) {
                return value
                    .map((item) => (typeof item === "string" ? item.trim() : ""))
                    .filter(Boolean);
            }

            if (typeof value === "string") {
                return value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean);
            }

            return [];
        };

        const images = Array.isArray(media?.images)
            ? media.images.filter((item) => typeof item === "string" && item.trim())
            : [];
        const video = typeof media?.video === "string" ? media.video.trim() : "";

        if (images.length > 5) {
            return res.status(400).json({
                error: "Maximum 5 images autorisées.",
            });
        }

        if (Array.isArray(media?.video)) {
            return res.status(400).json({
                error: "Une seule vidéo est autorisée.",
            });
        }

        const newJobPayload = {
            title,
            description,
            location,
            contractType,
            salaryRange,
            workMode,
            experienceLevel,
            responsibilities: normalizeList(responsibilities),
            profile: normalizeList(profile),
            benefits: normalizeList(benefits),
            recruitmentProcess,
            recruiter,
            applications: []   // 🔥 toujours initialiser proprement
        };

        if (images.length || video) {
            newJobPayload.media = {
                images,
                video: video || "",
            };
        }

        const newJob = new Job(newJobPayload);

        await newJob.save();

        return res.status(201).json({
            success: true,
            message: "Offre publiée avec succès.",
            job: newJob,
        });

    } catch (error) {
        return res.status(500).json({
            error: "Erreur lors de la création de l'offre.",
            details: error.message,
        });
    }
};

/* ============================================================
   GET /api/jobs
   ➤ Liste globale des offres (pour candidats)
============================================================ */
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate("recruiter", "companyName name email avatar")
            .sort({ createdAt: -1 });

        return res.status(200).json(jobs);

    } catch (error) {
        return res.status(500).json({
            error: "Erreur serveur lors de la récupération des offres.",
            details: error.message,
        });
    }
};

/* ============================================================
   GET /api/jobs/recent
   ➤ Offres récentes (compactes pour le feed)
============================================================ */
exports.getRecentJobs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

        const jobs = await Job.find({ isActive: { $ne: false } })
            .populate("recruiter", "companyName name")
            .sort({ createdAt: -1 })
            .limit(limit);

        const data = jobs.map((job) => ({
            jobId: job._id,
            title: job.title,
            company: job.recruiter?.companyName || job.recruiter?.name || "Entreprise",
            location: job.location,
            type: job.contractType,
            createdAt: job.createdAt,
        }));

        return res.json({ ok: true, data });
    } catch (error) {
        return res.status(500).json({
            error: "Erreur serveur lors de la récupération des offres récentes.",
            details: error.message,
        });
    }
};

/* ============================================================
   GET /api/jobs/:id
   ➤ Détails d'une offre
============================================================ */
exports.getJobById = async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findById(id)
            .populate("recruiter", "companyName name email avatar");

        if (!job) {
            return res.status(404).json({ error: "Offre introuvable." });
        }

        return res.status(200).json(job);
    } catch (error) {
        return res.status(500).json({
            error: "Erreur serveur lors de la récupération de l'offre.",
            details: error.message,
        });
    }
};

/* ============================================================
   GET /api/jobs/search
   ➤ Recherche d'offres (backend source of truth)
============================================================ */
exports.searchJobs = async (req, res) => {
    try {
        const { q, city, country, category, recruiter, contract, mode, workMode } = req.query;

        const andConditions = [
            { isActive: { $ne: false } }
        ];

        const orConditions = [];
        const normalizedQ = q?.trim();

        if (normalizedQ) {
            const textRegex = { $regex: normalizedQ, $options: "i" };

            orConditions.push(
                { title: textRegex },
                { description: textRegex },
                { city: textRegex },
                { country: textRegex },
                { category: textRegex },
                { location: textRegex },
                { "company.name": textRegex },
                { "recruiter.name": textRegex },
                { "recruiter.companyName": textRegex },
                { contractType: textRegex },
                { workMode: textRegex },
                { salaryRange: textRegex },
            );

            const normalizedLower = normalizedQ.toLowerCase();
            const contractKeywords = ["cdi", "cdd", "alternance", "stage", "freelance"];

            contractKeywords.forEach((keyword) => {
                if (normalizedLower.includes(keyword)) {
                    orConditions.push({ contractType: { $regex: `^${escapeRegex(keyword)}$`, $options: "i" } });
                }
            });

            const numericTokens = normalizedQ.match(/\d+(?:[.,]\d+)?/g);
            if (numericTokens?.length) {
                numericTokens.forEach((token) => {
                    const numericRegex = { $regex: escapeRegex(token), $options: "i" };
                    orConditions.push({ salaryRange: numericRegex });
                });
            }

            andConditions.push({ $or: orConditions });
        }

        if (city?.trim()) {
            const cityRegex = buildRegex(city.trim());
            andConditions.push({ $or: [{ city: cityRegex }, { location: cityRegex }] });
        }

        if (country?.trim()) {
            const countryRegex = buildRegex(country.trim());
            andConditions.push({ $or: [{ country: countryRegex }, { location: countryRegex }] });
        }

        if (category?.trim()) {
            const categoryRegex = buildRegex(category.trim());
            andConditions.push({ category: categoryRegex });
        }

        if (recruiter?.trim()) {
            andConditions.push({ recruiter: recruiter.trim() });
        }

        if (contract?.trim()) {
            andConditions.push({ contractType: contract.trim() });
        }

        const normalizedMode = mode?.trim() || workMode?.trim();
        if (normalizedMode) {
            const modeRegex = buildRegex(normalizedMode);
            andConditions.push({ workMode: modeRegex });
        }

        const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

        const jobs = await Job.find(query)
            .populate("recruiter", "companyName name email avatar")
            .sort({ createdAt: -1 });

        return res.json({ ok: true, data: jobs });

    } catch (error) {
        console.error("Erreur recherche offres:", error);
        return res.status(500).json({
            ok: false,
            error: "Erreur serveur lors de la recherche d'offres.",
            details: error.message,
        });
    }
};

/* ============================================================
   GET /api/jobs/my-jobs
   ➤ Offres publiées par le recruteur connecté
============================================================ */
exports.getMyJobs = async (req, res) => {
    try {
        const recruiterId = req.user.id;

        const jobs = await Job.find({ recruiter: recruiterId })
            .populate({
                path: "applications",
                populate: {
                    path: "applicant",
                    select: "name email avatar role bio professionalProfile",
                },
            })
            .sort({ createdAt: -1 });

        return res.status(200).json(jobs);

    } catch (error) {
        return res.status(500).json({
            error: "Erreur serveur lors de la récupération des offres.",
            details: error.message,
        });
    }
};

/* ============================================================
   POST /api/jobs/apply
   ➤ Candidat postule à une offre
============================================================ */
exports.applyToJob = async (req, res) => {
    try {
        const { jobId } = req.body;
        const candidateId = req.user.id;

        // Vérifier si job existe
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Offre introuvable." });
        }

        // Vérifier doublon
        const candidate = await require("../models/User").findById(candidateId).select("name email");

        if (!candidate?.email) {
            return res.status(400).json({
                message: "Votre profil ne contient pas d'email valide.",
            });
        }

        const existing = await Application.findOne({
            job: jobId,
            applicantEmail: (candidate.email || "").toLowerCase().trim(),
        });

        if (existing) {
            return res.status(400).json({
                message: "Vous avez déjà postulé à cette offre.",
            });
        }

        // Créer candidature
        const application = await Application.create({
            job: jobId,
            recruiter: job.recruiter,
            applicant: candidateId,
            applicantName: candidate.name || candidate.email,
            applicantEmail: (candidate.email || "").toLowerCase().trim(),
            status: "pending",
        });

        // 🔥 AJOUT AUTOMATIQUE SUR LE JOB
        await Job.findByIdAndUpdate(jobId, {
            $push: { applications: application._id },
        });

        return res.status(201).json({
            message: "Candidature envoyée avec succès.",
            application,
        });

    } catch (error) {
        return res.status(500).json({
            error: "Erreur lors de l’envoi de la candidature.",
            details: error.message,
        });
    }
};
