import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { color, font, radius, s, spacing } from "../theme";

export type ChipSize = "default" | "compact" | "dense" | "filter" | "tab";

function chipMetrics(size: ChipSize) {
  switch (size) {
    case "dense":
      return { height: s(16), pad: { left: s(4), right: s(4) }, margin: { right: s(2), bottom: s(2) }, fontSize: font.nano };
    case "compact":
      return { height: s(20), pad: { left: s(6), right: s(6) }, margin: { right: s(3), bottom: s(3) }, fontSize: font.micro };
    case "filter":
      return { height: s(20), pad: { left: s(7), right: s(7) }, margin: { right: s(3), bottom: 0 }, fontSize: font.caption };
    case "tab":
      return { height: s(32), pad: { left: s(12), right: s(12) }, margin: { right: s(6), bottom: s(6) }, fontSize: font.body };
    default:
      return { height: s(26), pad: { left: spacing.md, right: spacing.md }, margin: { right: spacing.xs, bottom: spacing.xs }, fontSize: font.caption };
  }
}

export function RmChip(props: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
  dense?: boolean;
  size?: ChipSize;
  tone?: "default" | "success";
}): ReactEcs.JSX.Element {
  const size = props.size ?? (props.dense ? "dense" : props.compact ? "compact" : "default");
  const metrics = chipMetrics(size);
  const success = props.tone === "success";
  const background = success
    ? props.active
      ? color.successStrong
      : color.successSoft
    : props.active
      ? color.chipBgActive
      : color.chipBg;
  const textColor = success
    ? props.active
      ? color.textInverted
      : color.success
    : props.active
      ? color.accent
      : color.textSecondary;
  return (
    <UiEntity
      uiTransform={{
        height: metrics.height,
        padding: metrics.pad,
        margin: metrics.margin,
        flexShrink: 0,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
      }}
      uiBackground={{ color: background }}
      uiText={{
        value: props.label,
        fontSize: metrics.fontSize,
        color: textColor,
      }}
      onMouseDown={props.onClick}
    />
  );
}
