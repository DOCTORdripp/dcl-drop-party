import { Color4 } from "@dcl/sdk/math";
import { rgbaForRarityLabel } from "../ui/rarityColors";
import { color } from "../ui/theme";

/** Drop Party castle gold on the Raffle Manager color system. */
export const chestColor = {
  panel: color.bg,
  elevated: color.bgElevated,
  card: color.surface,
  cardSelected: color.accentSoft,
  row: color.surfaceSoft,
  track: color.toggleTrack,
  gold: color.accent,
  text: color.textPrimary,
  muted: color.textSecondary,
  dim: color.textMuted,
  success: color.success,
  warning: color.warning,
  danger: color.danger,
  accent: color.accent,
  badgeOpen: color.successStrong,
  badgeHost: color.accentDeep,
  badgeLocked: Color4.create(0.42, 0.18, 0.18, 1),
};

export function rarityColor(rarity: string): Color4 {
  const rgba = rgbaForRarityLabel(rarity);
  return Color4.create(rgba.r, rgba.g, rgba.b, rgba.a);
}

export function truncateLabel(value: string, max = 28): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

export function slotLabel(slot?: string): string {
  switch (slot) {
    case "upper_body":
      return "Upper";
    case "lower_body":
      return "Lower";
    case "facial_hair":
      return "Beard";
    case "hands_wear":
      return "Hands";
    case "eyebrows":
      return "Brows";
    case "top_head":
      return "Top";
    case "eyewear":
      return "Glasses";
    default:
      return slot ? slot.replace(/_/g, " ") : "";
  }
}
