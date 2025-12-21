// src/components/StoriesFB.jsx (VERSION INTÉGRALE ET CORRIGÉE)

import { useState, useRef, useEffect } from "react"; 
import StoriesViewer from "./StoriesViewer"; 
import "./../styles/stories.css"; 
// 💥 NOUVEL IMPORT : La fonction pour générer l'URL complète
import { getImageUrl } from "../utils/imageUtils"; 

export default function StoriesFB() {
  const [isUploading, setIsUploading] = useState(false);
  const [stories, setStories] = useState([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0); 
  
  const fileInputRef = useRef(null); 

  const token = localStorage.getItem("token");
  const API = "https://emploisfacile.org"; // Gardé pour les appels fetch

  /* =======================================
     FONCTIONS DE GESTION DE LA MODALE (StoriesViewer)
     ======================================= */
  
  // NOUVEAU : Ouvre le viewer et retire le focus
  const openStory = (index, event) => {
    setStartIndex(index);
    setIsViewerOpen(true);
    
    // CORRECTION JS : Retire le focus de l'élément cliqué
    if (event && event.currentTarget) {
        event.currentTarget.blur();
    } else if (document.activeElement) {
        document.activeElement.blur();
    }
  };

  // Ferme le viewer
  const closeStory = () => {
    setIsViewerOpen(false);
    setStartIndex(0); 
  };
  
  /* =======================================
     CHARGEMENT DES STORIES
     ======================================= */
  // ... (Code de useEffect et loadStories inchangé) ...
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const res = await fetch(`${API}/api/stories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStories(Array.isArray(data) ? data : []);
      } else {
        console.error("Échec du chargement des stories:", res.status);
      }
    } catch (error) {
      console.error("Erreur réseau/serveur lors du chargement des stories:", error);
    }
  };
  
  /* =======================================
     LOGIQUE D'UPLOAD
     ======================================= */
  
  const handleCreateStoryClick = (event) => { 
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
    // CORRECTION JS pour la carte Créer
    if (event && event.currentTarget) {
        event.currentTarget.blur();
    } else if (document.activeElement) {
        document.activeElement.blur();
    }
  };
  
  // ... (Code de handleFileChange et uploadStory inchangé) ...
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      uploadStory(selectedFile); 
    }
  };

  const uploadStory = async (storyFile) => {
    setIsUploading(true);
    
    const fd = new FormData();
    fd.append("file", storyFile); 

    try {
      const res = await fetch(`${API}/api/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        alert("Story publiée avec succès !");
        loadStories(); // Recharge les stories après un succès
      } else {
        console.error("Échec de la publication:", res.status);
        alert(`Échec de la publication (Statut: ${res.status})`);
      }
    } catch (error) {
      console.error("Erreur réseau/serveur:", error);
      alert("Erreur de connexion au serveur.");
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = null; 
    }
  };


  /* =======================================
     RENDU
     ======================================= */
  
  return (
    <>
      <div className="fb-stories-container">

        {/* 1. INPUT DE FICHIER (CACHÉ) */}
        <input
          type="file"
          ref={fileInputRef} 
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }} 
          disabled={isUploading}
        />
        
        {/* 2. CARTE CRÉATRICE */}
        <div 
          className={`fb-story fb-story-create ${isUploading ? 'is-uploading' : ''}`}
          onClick={handleCreateStoryClick} 
        >
          <div className="fb-story-create-img">
            {/* Si l'utilisateur a un avatar, vous pourriez l'afficher ici pour la carte "Créer" */}
            {/* ... */}
          </div>
          <div className="fb-story-create-btn">
            {isUploading ? "Envoi..." : "Créer"}
          </div>
        </div>

        {/* 3. STORIES EXISTANTES (Cliquables) */}
        {stories.map((s, index) => (
          <div 
            key={s._id} 
            className="fb-story"
            onClick={(e) => openStory(index, e)} 
          >
            {/* 💥 CORRECTION DE L'IMAGE : Utilisation de getImageUrl */}
            <img
                src={getImageUrl(s.media.url)}
                className="fb-story-img"
                alt={s.user.name || "Story"}
                loading="lazy"
            />
            {/* ⚠️ NOTE : Si vous avez un avatar de l'auteur dans 's.user.avatar', 
               vous devriez l'afficher ici en utilisant getAvatarStyle comme icône */}
            <div className="fb-story-user">{s.user.name || "Utilisateur"}</div>
          </div>
        ))}

      </div>
      
      {/* 4. AFFICHEUR DE STORY (Modale conditionnelle) */}
      {isViewerOpen && stories.length > 0 && (
          <StoriesViewer
            stories={stories}
            startIndex={startIndex}
            onClose={closeStory}
          />
      )}
    </>
  );
}