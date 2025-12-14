const Job = require('../models/Job');
const Application = require('../models/Application');

/* ============================================================
   POST /api/jobs
   ➤ Créer une nouvelle offre (Recruteur)
============================================================ */
exports.createJob = async (req, res) => {
    try {
        const recruiter = req.user.id;

        const { title, description, location, contractType, salaryRange } = req.body;

        const newJob = new Job({
            title,
            description,
            location,
            contractType,
            salaryRange,
            recruiter,
            applications: []   // 🔥 toujours initialiser proprement
        });

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
                    path: "candidate",
                    select: "name email avatar role",
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
        const existing = await Application.findOne({
            job: jobId,
            candidate: candidateId,
        });

        if (existing) {
            return res.status(400).json({
                message: "Vous avez déjà postulé à cette offre.",
            });
        }

        // Créer candidature
        const application = await Application.create({
            job: jobId,
            candidate: candidateId,
            status: "Pending",
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
