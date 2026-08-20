import { getTrustTier } from "./score.js";
import type { HealthGrade, TrustTier } from "./types.js";

const TIER_COLORS: Record<TrustTier, string> = {
  platinum: "#4F46E5",
  gold: "#D97706",
  silver: "#64748B",
  bronze: "#C2410C",
  unrated: "#6B7280",
};

function formatTier(tier: TrustTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export interface BadgeOptions {
  label?: string;
  score: number;
  grade: HealthGrade;
}

export function generateBadgeSvg(options: BadgeOptions): string {
  const label = options.label ?? "observatory";
  const tier = getTrustTier(options.score);
  const value = formatTier(tier);
  const color = TIER_COLORS[tier];

  // Approximate text widths (7px per character for the 11px Verdana used by shields.io)
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>
    <text x="${labelWidth * 5}" y="140" transform="scale(.1)">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${value}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)">${value}</text>
  </g>
</svg>`;
}
