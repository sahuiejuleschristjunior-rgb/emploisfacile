import "../styles/Dashboard.css";

export default function RecruiterCompany() {
  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Entreprise</h2>
          <p>Centralisez les informations clés de votre marque employeur.</p>
        </div>
      </div>

      <section className="rd-card">
        <div className="empty-state">
          Cette section accueillera la fiche entreprise (logo, coordonnées,
          présentation). Utilisez déjà la page Profil pour mettre à jour vos
          informations principales.
        </div>
      </section>
    </>
  );
}
