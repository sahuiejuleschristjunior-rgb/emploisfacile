import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from '../components/NotificationItem';
// 💥 CORRECTION : Utilise le nom de fichier correct 'notifications.css'
import '../styles/notifications.css'; 
// Assurez-vous que le fichier est bien à /frontend/src/styles/notifications.css

const NOTIFS_PER_PAGE = 20;

export default function NotifsPage() {
    const nav = useNavigate();
    const token = localStorage.getItem("token");

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!token) {
            nav("/login");
            return;
        }
        // Charger la première page et marquer les notifs comme lues
        loadNotifications(1, true); 
    }, [token, nav]);

    // Fonction de chargement des notifications
    const loadNotifications = async (targetPage, markAsRead = false) => {
        setLoading(true);
        try {
            const url = `/api/notifications?page=${targetPage}&limit=${NOTIFS_PER_PAGE}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            if (res.ok) {
                // Si c'est la première page, on remplace; sinon on ajoute
                setNotifications(prev => 
                    targetPage === 1 ? data : [...prev, ...data]
                );
                setPage(targetPage);
                setHasMore(data.length === NOTIFS_PER_PAGE);
                
                // Si c'est la première page et qu'on doit les marquer lues
                if (targetPage === 1 && markAsRead) {
                    markAllAsRead(data);
                }
            } else {
                console.error("Erreur de chargement des notifications:", data);
                // Si l'erreur est liée à l'authentification
                if (res.status === 401) nav("/login"); 
            }
        } catch (err) {
            console.error("Erreur réseau:", err);
        } finally {
            setLoading(false);
        }
    };
    
    // Fonction pour marquer toutes les notifications chargées comme lues
    const markAllAsRead = async (loadedNotifications) => {
        // Vérifie s'il y a des non lus parmi les notifications chargées
        const hasUnread = loadedNotifications.some(n => !n.read);

        if (hasUnread) {
            try {
                // Envoie la requête au backend pour marquer toutes les notifications comme lues
                await fetch("/api/notifications/read-all", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                // Met à jour l'état local pour refléter la lecture sans recharger
                setNotifications(prev => prev.map(n => ({...n, read: true})));
            } catch (err) {
                console.error("Erreur de marquage de lecture:", err);
            }
        }
    };


    const handleLoadMore = () => {
        if (!loading && hasMore) {
            loadNotifications(page + 1);
        }
    };

    return (
        <div className="notifs-wrapper">
            <div className="notifs-header">
                <h2>Notifications</h2>
            </div>

            <div className="notifs-list">
                {notifications.length === 0 && !loading && (
                    <div className="notifs-empty">
                        Vous n'avez aucune notification.
                    </div>
                )}
                
                {notifications.map(notif => (
                    <NotificationItem
                        key={notif._id}
                        notif={notif}
                        onHandled={(id, extra) => {
                            if (extra?.handled) {
                                setNotifications(prev => prev.filter(n => n._id !== id));
                                setUnread(count => Math.max(0, count - 1));
                            }
                        }}
                    />
                ))}

                {loading && (
                    <div className="notifs-loading">Chargement...</div>
                )}

                {!loading && hasMore && (
                    <div className="notifs-load-more-container">
                         <button onClick={handleLoadMore} className="notif-load-more-btn">
                            Charger plus
                        </button>
                    </div>
                )}
                
                {!loading && !hasMore && notifications.length > 0 && (
                    <div className="notifs-empty">
                        Toutes les notifications ont été chargées.
                    </div>
                )}
            </div>
        </div>
    );
}