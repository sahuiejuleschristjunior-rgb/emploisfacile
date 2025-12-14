export default function FBIcon({ name, size = 26 }) {
  const color = "#ffffff"; // Blanc pur visible comme Facebook

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
    default:
      return null;
  }
}