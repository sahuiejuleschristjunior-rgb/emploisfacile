// ================================
// IMPORTS — TOUJOURS EN PREMIER
// ================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ChangePassword from "./pages/ChangePassword";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtpRegister from "./pages/VerifyOtpRegister";
import VerifyOtpReset from "./pages/VerifyOtpReset";
import NewPassword from "./pages/NewPassword";

import AdminDashboard from "./pages/AdminDashboard";

import FacebookLayout from "./pages/FacebookLayout";
import ProfilPage from "./pages/ProfilPage";
import PublicProfile from "./pages/PublicProfile";
import NotifsPage from "./pages/NotifsPage";
import EmploisPage from "./pages/EmploisPage";
import SettingsPage from "./pages/SettingsPage";
import PostPage from "./pages/PostPage";
import ChatPage from "./pages/ChatPage";

import Messages from "./pages/Messages.jsx";
import JobDetailPage from "./pages/JobDetailPage";

import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";
import RecruiterJobApplications from "./pages/RecruiterJobApplications";
import RecruiterAllApplications from "./pages/RecruiterAllApplications";

import FacebookFeed from "./components/FacebookFeed";

import PhotoViewerPage from "./pages/PhotoViewerPage";
import RelationsPage from "./pages/RelationsPage";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";

// ================================
// CODE RUNTIME (APRÈS IMPORTS)
// ================================
window.addEventListener("error", (e) => {
  console.log("🔥 GLOBAL ERROR:", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.log("🔥 PROMISE ERROR:", e.reason);
});

// ================================
// APP
// ================================
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing */}
              <Route
                path="/"
                element={
                  <ProtectedRoute redirectIfAuth to="/fb">
                    <LandingPage />
                  </ProtectedRoute>
                }
              />

              {/* Public */}
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-register" element={<VerifyOtpRegister />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/verify-reset" element={<VerifyOtpReset />} />
              <Route path="/new-password" element={<NewPassword />} />

              {/* Profil Public */}
              <Route path="/profil/:id" element={<PublicProfile />} />

              {/* ================= FACEBOOK LAYOUT ================= */}
              <Route
                path="/fb"
                element={
                  <ProtectedRoute>
                    <FacebookLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacebookFeed />} />
                <Route path="post/:id" element={<PostPage />} />

                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />

                <Route path="relations" element={<RelationsPage />} />
                <Route path="emplois" element={<EmploisPage />} />
                <Route path="notifications" element={<NotifsPage />} />
              </Route>

              {/* Profil perso */}
              <Route
                path="/profil"
                element={
                  <ProtectedRoute>
                    <ProfilPage />
                  </ProtectedRoute>
                }
              />

              {/* Messages */}
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />

              {/* Chat privé */}
              <Route
                path="/messages/:id"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Post hors layout */}
              <Route
                path="/post/:id"
                element={
                  <ProtectedRoute>
                    <PostPage />
                  </ProtectedRoute>
                }
              />

              {/* Jobs hors layout */}
              <Route
                path="/emplois"
                element={
                  <ProtectedRoute>
                    <EmploisPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/emplois/:id"
                element={
                  <ProtectedRoute>
                    <JobDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Recruiter */}
              <Route
                path="/recruiter/dashboard"
                element={
                  <ProtectedRoute roles={["recruiter"]}>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/candidatures"
                element={
                  <ProtectedRoute roles={["recruiter"]}>
                    <RecruiterAllApplications />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recruiter/job/:jobId"
                element={
                  <ProtectedRoute roles={["recruiter"]}>
                    <RecruiterJobApplications />
                  </ProtectedRoute>
                }
              />

              {/* Candidate */}
              <Route
                path="/candidate/dashboard"
                element={
                  <ProtectedRoute roles={["candidate"]}>
                    <CandidateDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Photo Viewer */}
              <Route
                path="/photo/:postId/:index"
                element={
                  <ProtectedRoute>
                    <PhotoViewerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/photo/:postId"
                element={
                  <ProtectedRoute>
                    <PhotoViewerPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

// ================================
// ROLE ROUTER
// ================================
function DashboardRouter() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/fb" replace />;

  if (user.role === "recruiter") return <RecruiterDashboard />;
  if (user.role === "candidate") return <CandidateDashboard />;

  return <Navigate to="/fb" replace />;
}
