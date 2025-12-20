import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPage } from "../api/pagesApi";
import "../styles/page.css";
import { PAGE_CATEGORY_GROUPS } from "../utils/pageCategories";

export default function PageCreate() {
  const [form, setForm] = useState({ name: "", categories: [], bio: "", contact: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const nav = useNavigate();

  const allCategories = useMemo(
    () =>
      PAGE_CATEGORY_GROUPS.flatMap((group) =>
        group.options.map((option) => ({ option, group: group.label }))
      ),
    []
  );

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return allCategories;
    return allCategories.filter(
      (item) =>
        item.option.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query)
    );
  }, [allCategories, categoryQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleCategory = (category) => {
    setForm((prev) => {
      const alreadySelected = prev.categories.includes(category);
      if (alreadySelected) {
        setError("");
        return { ...prev, categories: prev.categories.filter((c) => c !== category) };
      }

      if (prev.categories.length >= 3) {
        setError("Maximum 3 catégories");
        return prev;
      }

      setError("");
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.categories.length) {
      setError("Sélectionnez au moins une catégorie");
      return;
    }
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

        <div
          className="category-selector"
          tabIndex={-1}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
        >
          <div className="selector-label">Catégories (max 3)</div>
          <div className="selector-input" onClick={() => setShowDropdown(true)}>
            <div className="selected-chips">
              {form.categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className="chip"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat} <span className="chip-remove">×</span>
                </button>
              ))}
              <input
                type="text"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder={form.categories.length ? "Ajouter une catégorie" : "Rechercher une catégorie"}
              />
            </div>
          </div>

          {showDropdown && (
            <div className="selector-dropdown">
              {filteredCategories.length === 0 && (
                <div className="dropdown-empty">Aucune catégorie trouvée</div>
              )}
              {PAGE_CATEGORY_GROUPS.map((group) => {
                const options = group.options.filter((opt) =>
                  filteredCategories.some((c) => c.option === opt)
                );
                if (!options.length) return null;
                return (
                  <div className="dropdown-group" key={group.label}>
                    <div className="group-title">{group.label}</div>
                    <div className="group-options">
                      {options.map((opt) => {
                        const active = form.categories.includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            className={`option ${active ? "active" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggleCategory(opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label>
          Bio
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
          />
        </label>

        <label>
          Contact
          <input
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="Email, téléphone ou lien"
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
