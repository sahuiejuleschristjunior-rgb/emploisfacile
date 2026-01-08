import PageLoader from "../components/PageLoader";
import "../styles/auth.css";
import { useState } from "react";

export default function ChangePassword() {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setMsg("❌ Les mots de passe ne correspondent pas");
      return;
    }

    try {
      const res = await fetch("https://emploisfacile.org/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, password }),
      });

      const data = await res.json();
      setMsg(res.ok ? "✔️ Mot de passe modifié avec succès" : data.error || "Erreur");
    } catch {
      setMsg("❌ Erreur de connexion au serveur");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0b] px-6">
      <div className="w-full max-w-md bg-[#141414] rounded-2xl shadow-2xl p-8 border border-gray-800">

        <h1 className="text-3xl font-bold text-center text-white mb-8">
          ������ Nouveau mot de passe
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="text-gray-300 text-sm font-medium">Code OTP</label>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-[#1f1f1f] text-white focus:ring-2 focus:ring-gray-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium">Nouveau mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-[#1f1f1f] text-white focus:ring-2 focus:ring-gray-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-[#1f1f1f] text-white focus:ring-2 focus:ring-gray-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 transition-all rounded-xl text-white font-semibold shadow-lg shadow-black/40"
          >
            Mettre à jour
          </button>
        </form>

        {msg && (
          <p className="text-center mt-6 text-gray-300 text-sm">{msg}</p>
        )}
      </div>
    </div>
  );
}
