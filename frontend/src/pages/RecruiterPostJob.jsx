import PostJobForm from "../components/PostJobForm";
import "../styles/Dashboard.css";

export default function RecruiterPostJob() {
  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Publier une offre</h2>
          <p>Créez une nouvelle annonce et diffusez-la immédiatement.</p>
        </div>
      </div>

      <section className="rd-card rd-form-card">
        <PostJobForm />
      </section>
    </>
  );
}
