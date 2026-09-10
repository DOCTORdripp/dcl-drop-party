import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { Color4 } from "@dcl/sdk/math";
import { color, font, radius, s, spacing } from "../theme";

const COMPACT_OFF_TRACK = Color4.create(0.5, 0.44, 0.58, 1);
const COMPACT_OFF_LABEL = Color4.create(0.88, 0.86, 0.94, 1);
const LABEL_H = 18;

export function RmToggle(props: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  compact?: boolean;
  disabled?: boolean;
}): ReactEcs.JSX.Element {
  const compact = Boolean(props.compact);
  const disabled = Boolean(props.disabled);
  const offTrack = compact ? COMPACT_OFF_TRACK : color.toggleTrack;
  const offLabel = compact ? COMPACT_OFF_LABEL : color.textMuted;
  return (
    <UiEntity
      uiTransform={{
        flexGrow: 1,
        flexShrink: 1,
        flexDirection: "row",
        alignItems: "center",
        minHeight: compact ? s(32) : undefined,
        height: compact ? s(32) : undefined,
        padding: {
          top: compact ? s(4) : spacing.xs,
          bottom: compact ? s(4) : spacing.xs,
          left: spacing.xs,
          right: spacing.xs,
        },
        borderRadius: radius.md,
        margin: { right: spacing.xs },
      }}
      uiBackground={{ color: color.bgElevated }}
      onMouseDown={disabled ? undefined : () => props.onChange(!props.value)}
    >
      <UiEntity
        uiTransform={{
          width: s(30),
          height: s(16),
          borderRadius: radius.pill,
          justifyContent: props.value ? "flex-end" : "flex-start",
          alignItems: "center",
          padding: s(2),
          flexShrink: 0,
        }}
        uiBackground={{ color: props.value ? color.accent : offTrack }}
      >
        <UiEntity
          uiTransform={{ width: s(12), height: s(12), borderRadius: radius.circle }}
          uiBackground={{ color: color.textPrimary }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          margin: { left: spacing.xs },
          flexShrink: 1,
          minWidth: 0,
          height: s(LABEL_H),
          justifyContent: "center",
        }}
        uiText={{
          value: props.label,
          fontSize: font.micro,
          color: disabled ? color.textMuted : props.value ? color.accent : offLabel,
          textAlign: "middle-left",
          textWrap: "nowrap",
        }}
      />
    </UiEntity>
  );
}
