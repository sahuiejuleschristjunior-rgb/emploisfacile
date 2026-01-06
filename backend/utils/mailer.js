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
    const from = process.env.FROM_EMAIL_NO_REPLY;
    const safeApplicant = escapeHtml(applicantName || "Candidat");
    const safeEmail = escapeHtml(applicantEmail || "Email non communiqué");
    const safeJob = escapeHtml(jobTitle || "Offre");
    const safeRecruiter = escapeHtml(recruiterName || "recruteur");
    const safeMessage = escapeHtml(message || "Aucun message fourni").replace(/\n/g, "<br>");

    const html = `
      <p>Bonjour ${safeRecruiter},</p>
      <p>${safeApplicant} (${safeEmail}) a postulé pour le poste <strong>${safeJob}</strong>.</p>
      <p><strong>Message du candidat :</strong></p>
      <p>${safeMessage}</p>
      <p>Merci d'utiliser EmploisFacile pour vos recrutements.</p>
    `;

    const info = await transporterNoReply.sendMail({
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
