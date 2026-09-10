import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { color, font, s, spacing } from "../theme";

export function RmEmptyState(props: { title: string; subtitle?: string }): ReactEcs.JSX.Element {
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        minHeight: s(100),
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.md,
      }}
    >
      <UiEntity
        uiTransform={{ width: "100%", minHeight: s(26) }}
        uiText={{
          value: props.title,
          fontSize: font.body,
          color: color.textSecondary,
          textAlign: "middle-center",
          textWrap: "wrap",
        }}
      />
      {props.subtitle ? (
        <UiEntity
          uiTransform={{ width: "100%", minHeight: s(22), margin: { top: 2 } }}
          uiText={{
            value: props.subtitle,
            fontSize: font.micro,
            color: color.textMuted,
            textAlign: "middle-center",
            textWrap: "wrap",
          }}
        />
      ) : null}
    </UiEntity>
  );
}
