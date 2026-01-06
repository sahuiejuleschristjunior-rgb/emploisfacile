const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/* ============================================================
   1. TRANSPORT SMTP POUR INSCRIPTION
============================================================ */
const transporterInscription = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER_INSCRIPTION,
    pass: process.env.SMTP_PASS_INSCRIPTION,
  },
});

/* ============================================================
   2. TRANSPORT SMTP POUR NO-REPLY
============================================================ */
const transporterNoReply = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER_NO_REPLY,
    pass: process.env.SMTP_PASS_NO_REPLY,
  },
});

/* ============================================================
   3. TRANSPORT SMTP UNIQUE POUR LES CANDIDATURES
============================================================ */
const transporterApplications = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ============================================================
   3. VÉRIFICATION SMTP SÉCURISÉE (NE PLANTE PLUS LE SERVEUR)
============================================================ */
(async () => {
  try {
    await transporterInscription.verify();
    console.log("✔ SMTP INSCRIPTION CONNECTED");
  } catch (err) {
    console.error("❌ SMTP INSCRIPTION ERROR:", err.message);
  }

  try {
    await transporterNoReply.verify();
    console.log("✔ SMTP NO-REPLY CONNECTED");
  } catch (err) {
    console.error("❌ SMTP NO-REPLY ERROR:", err.message);
  }

  try {
    await transporterApplications.verify();
    console.log("✔ SMTP ready");
  } catch (err) {
    console.error("❌ SMTP error", err.message);
  }
})();

/* ============================================================
   4. ENVOI D’UN EMAIL HTML AVEC TEMPLATE
============================================================ */

exports.sendTemplateEmail = async (
  templateName,
  to,
  subject,
  variables = {},
  fromType = "noreply" // "inscription" OU "noreply"
) => {
  try {
    // Choix du transport SMTP
    const transporter =
      fromType === "inscription"
        ? transporterInscription
        : transporterNoReply;

    // Adresse expéditeur
    const from =
      fromType === "inscription"
        ? process.env.FROM_EMAIL_INSCRIPTION
        : process.env.FROM_EMAIL_NO_REPLY;

    console.log("SMTP_LOG", { to, subject });

    // Chemin du template
    const templatePath = path.join(__dirname, "../templates", templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }

    // Charger et remplir le template HTML
    let html = fs.readFileSync(templatePath, "utf8");

    for (const key in variables) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    }

    // Envoi du mail
    console.log("EMAIL SEND ATTEMPT", {
      to,
      subject,
      from,
      template: templateName,
      fromType,
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT OK", { to, subject, messageId: info?.messageId || null });
    return info;

  } catch (err) {
    console.error("EMAIL ERROR", err.message || err);
    // On renvoie l’erreur pour que le contrôleur puisse réagir
    throw err;
  }
};

/* ============================================================
   5. ENVOI D’UN EMAIL DE CANDIDATURE
============================================================ */
exports.sendApplicationEmail = async ({
  to,
  subject,
  applicantName,
  applicantEmail,
  message,
  jobTitle,
  recruiterName,
}) => {
  try {
    const from = process.env.FROM_EMAIL_NO_REPLY || process.env.SMTP_FROM || process.env.SMTP_USER;
    const safeApplicant = escapeHtml(applicantName || "Candidat");
    const safeEmail = escapeHtml(applicantEmail || "Email non communiqué");
    const safeJob = escapeHtml(jobTitle || "Offre");
    const safeRecruiter = escapeHtml(recruiterName || "recruteur");
    const safeMessage = escapeHtml(message || "Aucun message fourni").replace(/\n/g, "<br>");

    const dashboardUrl = `${process.env.APP_BASE_URL || "https://emploisfacile.com"}/dashboard/recruiter/applications`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
        <p>Bonjour ${safeRecruiter},</p>
        <p>${safeApplicant} (<a href="mailto:${safeEmail}">${safeEmail}</a>) a postulé pour le poste <strong>${safeJob}</strong>.</p>
        <p><strong>Message du candidat :</strong></p>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">${safeMessage}</div>
        <p style="margin-top:16px;">
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Consulter la candidature</a>
        </p>
        <p style="color:#6b7280;font-size:12px;">Merci d'utiliser EmploisFacile pour vos recrutements.</p>
      </div>
    `;

    const info = await transporterApplications.sendMail({
      from,
      to,
      subject,
      html,
      replyTo: applicantEmail || undefined,
    });

    console.log("EMAIL APPLICATION SENT", { to, subject, messageId: info?.messageId || null });
    return info;
  } catch (err) {
    console.error("EMAIL APPLICATION ERROR", err.message || err);
    throw err;
  }
};
