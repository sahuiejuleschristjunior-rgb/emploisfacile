import { useId } from "react";

export default function FBIcon({ name, size = 26 }) {
  const color = "#ffffff"; // Blanc pur visible comme Facebook
  const uniqueId = useId();
  const blueGradientId = `${uniqueId}-blueGrad`;
  const orangeGradientId = `${uniqueId}-orangeGrad`;

  switch (name) {

    /* ============================
       HOME — style Facebook Menu (bold)
    ============================ */
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill={color}>
          <path d="M25 12.5L14 4 3 12.5v11a2 2 0 0 0 2 2h6v-7h6v7h6a2 2 0 0 0 2-2z" />
        </svg>
      );

    /* ============================
       FRIENDS — style Facebook (bold)
    ============================ */
    case "friends":
      return (
        <svg width={size} height={size} fill={color} viewBox="0 0 28 28">
          <circle cx="9" cy="11" r="5" />
          <circle cx="19" cy="11" r="5" />
          <path d="M3 25c1-6 5-9 7-9h8c2 0 6 3 7 9H3z" />
        </svg>
      );

    /* ============================
       PAGES FEED — Facebook style icon
    ============================ */
    case "pages-feed":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#1DA1F2" />
          <rect x="5" y="5" width="14" height="9" rx="1.5" fill="#EAF4FF" />
          <path
            d="M9.5 12C8.1 12 7 11.1 7 10C7 8.9 8 8 9.2 8C9.6 6.8 10.8 6 12 6C13.6 6 14.9 7.2 15 8.7C16.2 8.9 17 9.8 17 10.8C17 11.6 16.3 12 15.5 12Z"
            fill="#1DA1F2"
          />
          <rect x="6" y="16.5" width="7" height="1.5" rx="0.75" fill="#EAF4FF" />
          <rect x="15" y="16.5" width="3" height="1.5" rx="0.75" fill="#EAF4FF" />
        </svg>
      );

    /* ============================
       MESSAGES — Messenger Bold
    ============================ */
    case "messages":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          viewBox="0 0 28 28"
        >
          <path d="M4 6h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H10l-6 4V8a2 2 0 0 1 2-2z" />
        </svg>
      );

    /* ============================
       NOTIFICATIONS — Bell Bold
    ============================ */
    case "notif":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          viewBox="0 0 28 28"
        >
          <path d="M22 19H6c-1 0-2-1-2-2 2-2 3-5 3-9a7 7 0 0 1 14 0c0 4 1 7 3 9 0 1-1 2-2 2z" />
          <path d="M16 23a3 3 0 0 1-6 0" />
        </svg>
      );

    /* ============================
       JOBS — Facebook Market Bold
    ============================ */
    case "jobs":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          viewBox="0 0 28 28"
        >
          <rect x="4" y="8" width="20" height="14" rx="2" />
          <path d="M18 8V6a5 5 0 0 0-10 0v2" />
        </svg>
      );

    /* ============================
       PROFILE — Bold Avatar
    ============================ */
    case "profile":
      return (
        <svg width={size} height={size} fill={color} viewBox="0 0 28 28">
          <circle cx="14" cy="9" r="6" />
          <path d="M5 25c1-7 8-9 9-9s8 2 9 9" />
        </svg>
      );

    /* ============================
       PAGES — Bookmark flag icon
    ============================ */
    case "pages":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"
          role="img"
          aria-label="Bookmark flag icon"
        >
          <defs>
            <linearGradient id={blueGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2EE6FF" />
              <stop offset="100%" stopColor="#0AB3E6" />
            </linearGradient>
            <linearGradient id={orangeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB38A" />
              <stop offset="100%" stopColor="#FF8A4C" />
            </linearGradient>
          </defs>
          <rect
            x="18"
            y="20"
            width="16"
            height="88"
            rx="8"
            fill={`url(#${blueGradientId})`}
          />
          <path
            d="
              M 34 24
              H 92
              C 98 24 102 28 102 34
              V 52
              H 86
              C 82 52 80 54 80 58
              C 80 62 82 64 86 64
              H 102
              V 94
              C 102 100 98 104 92 104
              H 34
              Z
            "
            fill={`url(#${orangeGradientId})`}
          />
        </svg>
      );

    /* ============================
       REELS — Bookmark flag icon
    ============================ */
    case "reels":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"
          role="img"
          aria-label="Reels icon"
        >
          <defs>
            <linearGradient id={blueGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2EE6FF" />
              <stop offset="100%" stopColor="#0AB3E6" />
            </linearGradient>
            <linearGradient id={orangeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB38A" />
              <stop offset="100%" stopColor="#FF8A4C" />
            </linearGradient>
          </defs>
          <rect
            x="18"
            y="20"
            width="16"
            height="88"
            rx="8"
            fill={`url(#${blueGradientId})`}
          />
          <path
            d="
              M 34 24
              H 92
              C 98 24 102 28 102 34
              V 52
              H 86
              C 82 52 80 54 80 58
              C 80 62 82 64 86 64
              H 102
              V 94
              C 102 100 98 104 92 104
              H 34
              Z
            "
            fill={`url(#${orangeGradientId})`}
          />
        </svg>
      );

    /* ============================
       SETTINGS — Boulon complet FB
    ============================ */
    case "settings":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <circle cx="14" cy="14" r="4" fill={color} />
          <path
            d="M4 14l2-2m2-6l1 3m11-3l1 3m2 6l2 2m-4 6l-1-3m-11 3l-1-3m-2-6l-2-2"
            strokeLinecap="round"
          />
        </svg>
      );

    /* ============================
       MENU — Hamburger Bold
    ============================ */
    case "menu":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="3"
          fill="none"
          viewBox="0 0 28 28"
        >
          <path d="M5 8h18" />
          <path d="M5 14h18" />
          <path d="M5 20h18" />
        </svg>
      );

    /* ============================
       SEARCH — Bold FB
    ============================ */
    case "search":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <circle cx="13" cy="13" r="8" />
          <path d="M19 19l6 6" strokeLinecap="round" />
        </svg>
      );

    /* ============================
       LOGOUT — Bold
    ============================ */
    case "logout":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <path d="M10 26H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h4" />
          <path d="M18 20l6-6-6-6" />
          <path d="M24 14H10" />
        </svg>
      );

    /* ============================
       LIKE — Facebook STYLE (Outline)
    ============================ */
    case "like":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          viewBox="0 0 28 28"
        >
          <path d="M7 25H5a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3h2v14z" />
          <path d="M11 11l2-7c0-.6.4-1 1-1s1 .4 1 1v6h7a3 3 0 0 1 3 3v1l-3 9H11V11z" />
        </svg>
      );

    /* ============================
       COMMENT — Facebook STYLE (Outline)
    ============================ */
    case "comment":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          viewBox="0 0 28 28"
        >
          <path d="M4 6h20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10l-6 4V8a2 2 0 0 1 2-2z" />
        </svg>
      );

    /* ============================
       SHARE — Facebook STYLE (Outline)
    ============================ */
    case "share":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 5L18 12L10 19V14C6 14 3.5 15.5 2 19C2.5 13 5.5 9 10 8V5Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "ads":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 256 256"
          role="img"
          aria-label="Megaphone icon"
        >
          <defs>
            <linearGradient id={`ads-gradient-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB3C7" />
              <stop offset="45%" stopColor="#FF9F7A" />
              <stop offset="75%" stopColor="#C77DFF" />
              <stop offset="100%" stopColor="#7B5CFF" />
            </linearGradient>
            <filter
              id={`ads-glow-${uniqueId}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="10" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="128"
            cy="128"
            r="92"
            fill={`url(#ads-gradient-${uniqueId})`}
            filter={`url(#ads-glow-${uniqueId})`}
          />
          <g fill="#ffffff" opacity="0.95">
            <path d="M64 116 L140 92 L140 164 L64 140 Z" />
            <rect x="92" y="140" width="22" height="48" rx="8" />
            <rect x="140" y="104" width="16" height="48" rx="6" />
          </g>
          <g fill="none" stroke="#ffffff" strokeWidth="8" opacity="0.85">
            <path d="M168 108 Q196 128 168 148" />
            <path d="M184 96 Q224 128 184 160" />
          </g>
        </svg>
      );
    case "dashboard":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 256 256"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <filter id={`glow-${uniqueId}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0"
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id={`cyan-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#39F3FF" />
              <stop offset="1" stopColor="#00C8FF" />
            </linearGradient>

            <filter id={`inner-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="0" dy="1" />
              <feGaussianBlur stdDeviation="1.2" result="offBlur" />
              <feComposite
                in="offBlur"
                in2="SourceAlpha"
                operator="arithmetic"
                k2="-1"
                k3="1"
                result="innerShadow"
              />
              <feColorMatrix
                in="innerShadow"
                type="matrix"
                values="0 0 0 0 0
                0 0 0 0 0.25
                0 0 0 0 0.35
                0 0 0 0.35 0"
              />
              <feComposite in2="SourceGraphic" operator="over" />
            </filter>
          </defs>

          <g filter={`url(#glow-${uniqueId})`}>
            <rect
              x="28"
              y="152"
              width="44"
              height="76"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="84"
              y="88"
              width="44"
              height="140"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="140"
              y="116"
              width="44"
              height="112"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="196"
              y="44"
              width="44"
              height="184"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
