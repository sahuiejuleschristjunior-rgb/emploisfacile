import { useId } from "react";

export default function MegaphoneIcon({ size = 18, ...props }) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, "");
  const gradientId = `megaphone-gradient-${safeId}`;
  const glowId = `megaphone-glow-${safeId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="Megaphone icon"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB3C7" />
          <stop offset="45%" stopColor="#FF9F7A" />
          <stop offset="75%" stopColor="#C77DFF" />
          <stop offset="100%" stopColor="#7B5CFF" />
        </linearGradient>

        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="128" cy="128" r="92" fill={`url(#${gradientId})`} filter={`url(#${glowId})`} />

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
}
