import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CandidateDashboard.css";

export default function CandidateDashboard() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingReco, setLoadingReco] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  /* ===========================================
     0) Logout
  ============================================*/
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  /* ===========================================
     1) Charger l'utilisateur
  ============================================*/
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.error("Erreur chargement user:", error);
      }
    }
  }, []);

  const commonHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  /* ===========================================
     2) Charger candidatures + favoris + reco
  ============================================*/
  useEffect(() => {
    if (!token) return;
    fetchApplications();
    fetchSavedJobs();
    fetchRecommended();
  }, [token]);

  /* ===========================================
     MES CANDIDATURES
  ============================================*/
  const fetchApplications = async () => {
    setLoadingApps(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/applications/my-applications`, {
        headers: commonHeaders,
      });

      if (!res.ok) throw new Error("Impossible de charger vos candidatures.");

      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data.applications || []);
    } catch (err) {
      setError(err.message || "Erreur réseau.");
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  /* ===========================================
     FAVORIS
  ============================================*/
  const fetchSavedJobs = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch(`${API_URL}/saved-jobs`, {
        headers: commonHeaders,
      });

      const data = await res.json();
      setSavedJobs(Array.isArray(data) ? data : data.savedJobs || []);
    } catch (err) {
      setSavedJobs([]);
    }
    setLoadingSaved(false);
  };

  const saveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ jobId }),
    });
    fetchSavedJobs();
  };

  const unsaveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs/${jobId}`, {
      method: "DELETE",
      headers: commonHeaders,
    });
    fetchSavedJobs();
  };

  /* ===========================================
     RECOMMANDATIONS
  ============================================*/
  const fetchRecommended = async () => {
    setLoadingReco(true);
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: commonHeaders,
      });

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
        ? data.jobs
        : data.data || [];

      setRecommendedJobs(arr.slice(0, 5));
    } catch (err) {
      setRecommendedJobs([]);
    }
    setLoadingReco(false);
  };

  /* ===========================================
     GROUPEMENT PAR STATUT
  ============================================*/
  const groupedApps = useMemo(() => {
    const groups = {
      applied: [],
      inReview: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    for (const app of applications) {
      const status = (app.status || "Pending").toLowerCase();
      if (status === "pending") groups.applied.push(app);
      else if (status === "reviewing") groups.inReview.push(app);
      else if (status === "interview") groups.interview.push(app);
      else if (status === "accepted") groups.offer.push(app);
      else if (status === "rejected") groups.rejected.push(app);
      else groups.applied.push(app);
    }
    return groups;
  }, [applications]);

  const totalApplications = applications.length;
  const upcomingInterviews = groupedApps.interview.length;
  const offersCount = groupedApps.offer.length;

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  /* ===========================================
     CONTACTER & APPEL VIDÉO
  ============================================*/
  const contactRecruiter = (recruiter) => {
    nav("/messages", {
      state: {
        userId: recruiter._id,
        name: recruiter.name || recruiter.companyName,
        avatar: recruiter.avatar,
      },
    });
  };

  const callRecruiter = (recruiter) => {
    nav("/video-call", {
      state: {
        userId: recruiter._id,
        name: recruiter.name || recruiter.companyName,
        avatar: recruiter.avatar,
        role: "candidate",
      },
    });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const statusConfig = {
    pending: { label: "Envoyée", color: "blue" },
    reviewing: { label: "En revue", color: "amber" },
    interview: { label: "Entretien", color: "indigo" },
    accepted: { label: "Offre reçue", color: "emerald" },
    rejected: { label: "Refusée", color: "rose" },
  };

  const profileCompletion = Math.min(
    Math.max(Number(user?.profileCompletion || user?.completion || 0), 0),
    100,
  );

  const profileViews = user?.profileViews || 0;
  const messagesCount = user?.unreadMessages || 0;

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [applications]);

  const upcomingAgenda = useMemo(() => {
    return groupedApps.interview.slice(0, 3).map((app) => ({
      title: app.job?.title || "Entretien prévu",
      company: app.job?.recruiter?.companyName || app.job?.recruiter?.name,
      when: app.interviewDate || app.updatedAt || app.createdAt,
      recruiter: app.job?.recruiter,
    }));
  }, [groupedApps.interview]);

  const renderStatusPill = (status) => {
    const key = (status || "pending").toLowerCase();
    const cfg = statusConfig[key] || statusConfig.pending;

    const colors = {
      blue: "bg-blue-100 text-blue-700",
      amber: "bg-amber-100 text-amber-700",
      indigo: "bg-indigo-100 text-indigo-700",
      emerald: "bg-emerald-100 text-emerald-700",
      rose: "bg-rose-100 text-rose-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded-md text-xs font-bold ${
          colors[cfg.color] || colors.blue
        }`}
      >
        {cfg.label}
      </span>
    );
  };

  const renderRecentRow = (app) => {
    const job = app.job || {};
    const recruiter = job.recruiter || {};
    const company = recruiter.companyName || recruiter.name || "Entreprise";
    const status = (app.status || "pending").toLowerCase();

    return (
      <tr
        key={app._id}
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => goToJob(job._id)}
      >
        <td className="px-6 py-4 text-sm font-medium text-gray-900">
          {company}
          <br />
          <span className="text-xs text-gray-400">{job.title || "Poste"}</span>
        </td>
        <td className="px-6 py-4">{renderStatusPill(status)}</td>
        <td className="px-6 py-4 text-sm text-gray-500">
          {app.updatedAt || app.createdAt
            ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
            : "-"}
        </td>
        <td className="px-6 py-4 text-right space-x-2">
          <button
            className="text-indigo-600 text-sm font-semibold hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              contactRecruiter(recruiter);
            }}
          >
            Contacter
          </button>
          <button
            className="text-indigo-600 text-sm font-semibold hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              callRecruiter(recruiter);
            }}
          >
            Appel vidéo
          </button>
        </td>
      </tr>
    );
  };

  const renderJobMiniCard = (job) => {
    if (!job) return null;
    const recruiterName =
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise";

    const isFav = savedJobs.some((s) => s.job?._id === job._id);

    return (
      <div
        key={job._id}
        className="p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm cursor-pointer transition"
        onClick={() => goToJob(job._id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{job.title}</p>
            <p className="text-xs text-gray-500">{recruiterName}</p>
          </div>
          <button
            className={`text-lg ${isFav ? "text-rose-500" : "text-gray-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              isFav ? unsaveJob(job._id) : saveJob(job._id);
            }}
            aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFav ? "♥" : "♡"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{job.location || "Localisation"}</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 font-sans antialiased text-gray-900 min-h-screen">
      <div className="flex min-h-screen">
        <aside
          className={`w-64 bg-indigo-900 text-white flex flex-col ${
            sidebarOpen ? "flex" : "hidden"
          } md:flex`}
        >
          <div className="p-6 flex items-center justify-between md:block">
            <h1 className="text-2xl font-bold italic">JobConnect</h1>
            <button
              className="md:hidden text-indigo-200"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <button className="flex w-full items-center gap-3 p-3 bg-indigo-800 rounded-lg text-left">
              <span className="w-5">📊</span> Dashboard
            </button>
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition"
              onClick={() => nav("/candidatures")}
            >
              <span className="w-5">💼</span> Mes Candidatures
            </button>
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition"
              onClick={() => nav("/messages")}
            >
              <span className="w-5">💬</span> Messages
              {messagesCount > 0 && (
                <span className="ml-auto bg-red-500 text-[10px] px-1.5 py-0.5 rounded-full">
                  {messagesCount}
                </span>
              )}
            </button>
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition"
              onClick={() => scrollToSection("favoris")}
            >
              <span className="w-5">❤️</span> Favoris
            </button>
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition"
              onClick={() => nav("/profil")}
            >
              <span className="w-5">👤</span> Mon Profil
            </button>
            <button
              className="flex w-full items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition"
              onClick={logout}
            >
              <span className="w-5">↩️</span> Déconnexion
            </button>
          </nav>
          <div className="p-4 border-t border-indigo-800 text-sm text-indigo-300">
            © 2025 JobConnect Inc.
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8">
            <div>
              <h2 className="text-xl font-bold">
                Bienvenue, {user?.name || "Candidat"} 👋
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Gérez vos candidatures et suivez vos prochaines étapes.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="relative p-2 text-gray-400 hover:text-indigo-600 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
              <button
                className="relative p-2 text-gray-400 hover:text-indigo-600"
                onClick={() => nav("/notifications")}
              >
                🔔
              </button>
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8 overflow-y-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Candidatures envoyées</p>
                <p className="text-3xl font-bold mt-1 text-indigo-600">{totalApplications}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Entretiens prévus</p>
                <p className="text-3xl font-bold mt-1 text-orange-500">{upcomingInterviews}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Vues du profil</p>
                <p className="text-3xl font-bold mt-1 text-emerald-500">{profileViews}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Messages reçus</p>
                <p className="text-3xl font-bold mt-1 text-purple-600">{messagesCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="recent">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800">Candidatures récentes</h3>
                  <button
                    className="text-indigo-600 text-sm font-semibold hover:underline"
                    onClick={() => nav("/candidatures")}
                  >
                    Voir tout
                  </button>
                </div>

                {loadingApps && (
                  <div className="p-6 text-sm text-gray-500">Chargement de vos candidatures…</div>
                )}

                {error && (
                  <div className="p-6 text-sm text-rose-600 font-semibold">{error}</div>
                )}

                {!loadingApps && recentApplications.length === 0 && !error && (
                  <div className="p-6 text-sm text-gray-500">Aucune candidature pour le moment.</div>
                )}

                {recentApplications.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-4">Entreprise</th>
                          <th className="px-6 py-4">Statut</th>
                          <th className="px-6 py-4">Dernière mise à jour</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {recentApplications.map(renderRecentRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-4">Agenda à venir</h3>
                  <div className="space-y-4">
                    {upcomingAgenda.length === 0 && (
                      <p className="text-sm text-gray-500">Aucun entretien programmé pour le moment.</p>
                    )}
                    {upcomingAgenda.map((event, idx) => (
                      <div
                        key={`${event.title}-${idx}`}
                        className="flex gap-4 items-start border-l-4 border-indigo-600 pl-4 py-1"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{event.title}</p>
                          {event.company && (
                            <p className="text-xs text-gray-500">{event.company}</p>
                          )}
                          {event.when && (
                            <p className="text-xs text-gray-500">
                              {new Date(event.when).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="ml-auto space-x-2 text-right">
                          <button
                            className="text-indigo-600 text-xs font-semibold hover:underline"
                            onClick={() => contactRecruiter(event.recruiter || {})}
                          >
                            Contacter
                          </button>
                          <button
                            className="text-indigo-600 text-xs font-semibold hover:underline"
                            onClick={() => callRecruiter(event.recruiter || {})}
                          >
                            Appel vidéo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-gray-800 mb-3">
                    Profil complété à {profileCompletion}%
                  </h3>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${profileCompletion}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    Ajoutez votre portfolio pour atteindre 100% !
                  </p>
                </div>

                <div className="space-y-4" id="favoris">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-800">Vos favoris</h4>
                    <span className="text-xs text-gray-500">{savedJobs.length}</span>
                  </div>
                  {loadingSaved && (
                    <div className="text-sm text-gray-500">Chargement…</div>
                  )}
                  {!loadingSaved && savedJobs.length === 0 && (
                    <div className="text-sm text-gray-500">Aucun favori pour le moment.</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedJobs.slice(0, 4).map((fav) => renderJobMiniCard(fav.job))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-800">Recommandé pour vous</h4>
                    <span className="text-xs text-gray-500">{recommendedJobs.length}</span>
                  </div>
                  {loadingReco && (
                    <div className="text-sm text-gray-500">Chargement des recommandations…</div>
                  )}
                  {!loadingReco && recommendedJobs.length === 0 && (
                    <div className="text-sm text-gray-500">Aucune recommandation pour le moment.</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recommendedJobs.slice(0, 4).map(renderJobMiniCard)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}