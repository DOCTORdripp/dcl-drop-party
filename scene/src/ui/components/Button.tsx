import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { color, font, radius, s, spacing } from "../theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "standby";
export type ButtonSize = "sm" | "md" | "lg" | "touch" | "xl";

type Props = {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  width?: number | "auto";
  hitSlop?: number;
};

function palette(variant: ButtonVariant): { bg: Color4; text: Color4 } {
  switch (variant) {
    case "primary":
      return { bg: color.accent, text: color.textInverted };
    case "secondary":
      return { bg: color.surfaceSoft, text: color.textPrimary };
    case "ghost":
      return { bg: color.transparent, text: color.textPrimary };
    case "danger":
      return { bg: color.danger, text: color.textInverted };
    case "success":
      return { bg: color.success, text: color.textInverted };
    case "standby":
      return { bg: color.accentDeep, text: color.textInverted };
  }
}

function sizing(size: ButtonSize) {
  switch (size) {
    case "sm":
      return {
        height: s(26),
        fontSize: font.caption,
        padding: { top: spacing.xs, bottom: spacing.xs, left: spacing.sm, right: spacing.sm },
      };
    case "md":
      return {
        height: s(32),
        fontSize: font.body,
        padding: { top: spacing.xs, bottom: spacing.xs, left: spacing.md, right: spacing.md },
      };
    case "lg":
      return {
        height: s(40),
        fontSize: font.subtitle,
        padding: { top: spacing.sm, bottom: spacing.sm, left: spacing.lg, right: spacing.lg },
      };
    case "touch":
      return {
        height: s(48),
        fontSize: s(14),
        padding: { top: spacing.sm, bottom: spacing.sm, left: spacing.md, right: spacing.md },
      };
    case "xl":
      return {
        height: s(60),
        fontSize: s(18),
        padding: { top: spacing.md, bottom: spacing.md, left: spacing.xl, right: spacing.xl },
      };
  }
}

export function RmButton(props: Props): ReactEcs.JSX.Element {
  const pal = palette(props.variant ?? "primary");
  const sz = sizing(props.size ?? "md");
  const disabled = Boolean(props.disabled);
  const hitSlop = Math.max(0, props.hitSlop ?? 0);
  const bg = disabled ? color.surfaceSoft : pal.bg;
  const fg = disabled ? color.textMuted : pal.text;
  return (
    <UiEntity
      uiTransform={{
        height: sz.height,
        width: props.fullWidth ? "100%" : props.width ?? "auto",
        padding: sz.padding,
        margin: { right: spacing.xs },
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
      }}
      uiBackground={{ color: bg }}
      uiText={{ value: props.label, fontSize: sz.fontSize, color: fg, textWrap: "nowrap" }}
      onMouseDown={disabled || hitSlop > 0 ? undefined : props.onClick}
    >
      {!disabled && hitSlop > 0 ? (
        <UiEntity
          uiTransform={{
            positionType: "absolute",
            position: {
              top: -hitSlop,
              bottom: -hitSlop,
              left: -hitSlop,
              right: -hitSlop,
            },
            pointerFilter: "block",
          }}
          uiBackground={{ color: color.transparent }}
          onMouseDown={props.onClick}
        />
      ) : null}
    </UiEntity>
  );
}
