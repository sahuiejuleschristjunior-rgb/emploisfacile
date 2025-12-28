import React, { useState } from "react";
import { API_URL } from "../api/config";
import "../styles/JobForm.css";

export default function PostJobForm({ onJobPosted }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        contractType: 'CDI',
        salaryRange: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user"));

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!form.title || !form.description || !form.location) {
            setError("Veuillez remplir tous les champs obligatoires.");
            setLoading(false);
            return;
        }

        if (!currentUser || currentUser.role !== "recruiter") {
            setError("Seul un recruteur peut publier une offre.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || data.error || "Erreur de publication.");
                setLoading(false);
                return;
            }

            setSuccess("Offre publiée avec succès !");
            setForm({
                title: '',
                description: '',
                location: '',
                contractType: 'CDI',
                salaryRange: ''
            });

            if (onJobPosted) onJobPosted(data.job);

        } catch (err) {
            console.error("Erreur réseau:", err);
            setError("Erreur lors de la publication.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="job-form-wrapper">
            <h2 className="section-title">Publier une offre d'emploi</h2>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="job-form-card">
                <form onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label>Titre du poste</label>
                        <input
                            name="title"
                            type="text"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="Ex: Développeur Full-Stack"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            rows="6"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Détaillez les missions, compétences..."
                            required
                        />
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Localisation</label>
                            <input
                                name="location"
                                type="text"
                                value={form.location}
                                onChange={handleChange}
                                placeholder="Ex: Abidjan, Télétravail"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Contrat</label>
                            <select
                                name="contractType"
                                value={form.contractType}
                                onChange={handleChange}
                                required
                            >
                                <option value="CDI">CDI</option>
                                <option value="CDD">CDD</option>
                                <option value="Stage">Stage</option>
                                <option value="Freelance">Freelance</option>
                                <option value="Temps Partiel">Temps Partiel</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Salaire (optionnel)</label>
                        <input
                            name="salaryRange"
                            type="text"
                            value={form.salaryRange}
                            onChange={handleChange}
                            placeholder="Ex: 400k - 600k / mois"
                        />
                    </div>

                    <button className="btn-primary" disabled={loading}>
                        {loading ? "Publication..." : "Publier l'offre"}
                    </button>
                </form>
            </div>
        </div>
    );
}
