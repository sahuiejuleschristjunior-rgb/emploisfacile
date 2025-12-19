import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPage } from "../api/pagesApi";
import "../styles/page.css";

export default function PageCreate() {
  const [form, setForm] = useState({ name: "", category: "", bio: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await createPage(form);
      if (res?.slug) {
        nav(`/pages/${res.slug}`);
      } else {
        setError(res?.error || "Impossible de créer la page");
      }
    } catch (err) {
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <h1>Créer une Page</h1>
      <p>Nom, catégorie et bio courte pour votre page.</p>

      <form className="page-form" onSubmit={handleSubmit}>
        <label>
          Nom de la page
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Catégorie
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            placeholder="business, creator, media..."
          />
        </label>

        <label>
          Bio
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
          />
        </label>

        {error && <div className="error-text">{error}</div>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Création..." : "Créer"}
        </button>
      </form>
    </div>
  );
}
