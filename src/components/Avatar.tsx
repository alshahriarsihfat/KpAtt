"use client";

import type { StaffProfile } from "@/lib/types";

interface AvatarProps {
  profile: Pick<StaffProfile, "name" | "avatarHue">;
  size?: number;
  ring?: boolean;
}

export function Avatar({ profile, size = 40, ring = false }: AvatarProps) {
  const initials = profile.name
    .replace(/\(Supervisor\)/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const hue = profile.avatarHue;
  const bg = `linear-gradient(135deg, hsl(${hue} 70% 30%) 0%, hsl(${
    (hue + 40) % 360
  } 80% 22%) 100%)`;
  const accent = `hsl(${hue} 80% 65%)`;

  return (
    <div
      className="relative inline-flex items-center justify-center font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        boxShadow: ring
          ? `0 0 0 2px rgba(255,255,255,0.06), 0 0 0 4px ${accent}`
          : "0 0 0 2px rgba(255,255,255,0.05)",
        fontSize: size * 0.36,
        letterSpacing: "0.02em"
      }}
    >
      <span
        aria-hidden
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
        style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
      />
      {initials || "?"}
    </div>
  );
}
