const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const mailer = require("../utils/mailer");

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const normalizeText = (value = "") => String(value).trim();

/* ============================================================
   POST /api/applications
   ➤ Le candidat postule à une offre
============================================================ */
exports.applyToJob = async (req, res) => {
  const { jobId, message } = req.body || {};
  const applicantId = req.user?.id;

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return res.status(400).json({ message: "Identifiant d'offre invalide." });
  }

  try {
    const job = await Job.findById(jobId).populate("recruiter", "name email companyName");

    if (!job) {
      return res.status(404).json({ message: "Offre d'emploi introuvable." });
    }

    const recruiter = job.recruiter;
    if (!recruiter || !recruiter.email) {
      return res.status(400).json({ message: "Aucun contact recruteur disponible pour cette offre." });
    }

    const applicant = await User.findById(applicantId).select("name email role");
    if (!applicant) {
      return res.status(401).json({ message: "Profil candidat introuvable." });
    }

    const applicantEmail = normalizeEmail(applicant.email);
    if (!applicantEmail) {
      return res.status(400).json({ message: "Votre profil ne contient pas d'email valide." });
    }

    const applicantName = normalizeText(applicant.name) || applicantEmail || "Candidat EmploisFacile";

    const duplicate = await Application.findOne({ job: jobId, applicantEmail });
    if (duplicate) {
      return res.status(400).json({ message: "Vous avez déjà postulé à cette offre." });
    }

    const recruiterName = normalizeText(recruiter.companyName || recruiter.name);
    const fallbackMessage = `Bonjour,\n\nJe souhaite postuler au poste ${job.title || ""} chez ${recruiterName || "votre entreprise"}.\n\n${applicantName}`;
    const finalMessage = normalizeText(message) || fallbackMessage;

    const application = await Application.create({
      job: jobId,
      recruiter: recruiter._id || recruiter,
      applicant: applicant._id,
      applicantName,
      applicantEmail,
      message: finalMessage,
    });

    await Job.findByIdAndUpdate(jobId, { $addToSet: { applications: application._id } });

    const subject = `Nouvelle candidature – ${job.title || "Offre"}`;
    await mailer.sendApplicationEmail({
      to: recruiter.email,
      subject,
      applicantName,
      applicantEmail,
      message: finalMessage,
      jobTitle: job.title,
      recruiterName: recruiterName || recruiter.email,
    });

    return res.status(201).json({ success: true, applicationId: application._id });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Vous avez déjà postulé à cette offre." });
    }

    console.error("APPLY_TO_JOB_ERROR", error);
    return res.status(500).json({
      error: "Erreur serveur lors de la création de la candidature.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/my-applications
   ➤ Candidat : voir ses propres candidatures
============================================================ */
exports.getMyApplications = async (req, res) => {
  const applicantId = req.user.id;

  try {
    const applications = await Application.find({ applicant: applicantId })
      .populate({
        path: "job",
        select: "title location contractType salaryRange recruiter",
        populate: { path: "recruiter", select: "name companyName email avatar" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidatures.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/status?jobId=:jobId
   ➤ Candidat : vérifier s'il a déjà postulé
============================================================ */
exports.getApplicationStatus = async (req, res) => {
  const { jobId } = req.query;
  const applicantId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Identifiant d'offre invalide." });
    }

    const applicant = await User.findById(applicantId).select("email");
    const applicantEmail = normalizeEmail(applicant?.email);
    if (!applicantEmail) {
      return res.status(400).json({ message: "Profil candidat incomplet." });
    }

    const existing = await Application.findOne({ job: jobId, applicantEmail }).select("_id");
    return res.status(200).json({ hasApplied: Boolean(existing) });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la vérification de la candidature.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/job/:jobId
   ➤ Recruteur : voir les candidats d'une offre
============================================================ */
exports.getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const recruiterId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Identifiant d'offre invalide." });
    }

    const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
    if (!job) {
      return res.status(404).json({ message: "Offre introuvable ou non autorisée." });
    }

    const applications = await Application.find({ job: jobId })
      .populate("applicant", "name email avatar role")
      .sort({ createdAt: -1 })
      .populate("job", "title location contractType workMode salaryRange");

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidats.",
      details: error.message,
    });
  }
};

/* ============================================================
   PATCH /api/applications/:applicationId/status
   ➤ Recruteur : changer statut de candidature
============================================================ */
exports.updateApplicationStatus = async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;
  const recruiterId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Identifiant de candidature invalide." });
    }

    const application = await Application.findById(applicationId).populate("job", "recruiter");

    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }

    if (String(application.recruiter || application.job?.recruiter) !== recruiterId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette candidature." });
    }

    const allowedStatuses = ["pending", "reviewed", "accepted", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Statut invalide." });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Statut mis à jour : ${status}`,
      application,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la mise à jour du statut.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/recruiter
   ➤ Recruteur : voir toutes ses candidatures globales
============================================================ */
exports.getRecruiterApplications = async (req, res) => {
  const recruiterId = req.user.id;

  try {
    const applications = await Application.find({ recruiter: recruiterId })
      .populate("applicant", "name email avatar role")
      .populate("job", "title location contractType workMode salaryRange")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidatures recruteur.",
      details: error.message,
    });
  }
};

/* ============================================================
   LEGACY: GET /api/applications/recruiter/all (compat)
============================================================ */
exports.getAllApplicationsForRecruiter = exports.getRecruiterApplications;
