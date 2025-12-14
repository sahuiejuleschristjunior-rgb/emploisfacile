const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Le titre du poste est requis."],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "La description du poste est requise."],
  },
  location: {
    type: String,
    required: [true, "La localisation est requise."],
  },
  contractType: {
    type: String,
    enum: ['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance'],
    required: [true, "Le type de contrat est requis."],
  },
  salaryRange: {
    type: String,
    default: 'Non spécifié',
  },

  // 🔥 Liste des candidatures liées au job
  applications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    }
  ],

  // 🔥 Recruteur qui a publié l'offre
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // 🔥 Job actif ou désactivé
  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema);