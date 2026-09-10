import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { thumbnailDisplaySrc, thumbnailPlaceholder } from "../../shared/inventoryBrowser";
import { color, font, radius, s } from "../theme";

export function ItemThumbnailBox(props: {
  kind: "wearable" | "emote";
  thumbnailUrl?: string;
  size?: number;
}): ReactEcs.JSX.Element {
  const displaySrc = thumbnailDisplaySrc(props.thumbnailUrl);
  const wh = s(props.size ?? 44);
  return (
    <UiEntity
      uiTransform={{
        width: wh,
        height: wh,
        borderRadius: radius.md,
        flexShrink: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        positionType: "relative",
      }}
      uiBackground={{ color: color.surface }}
    >
      {displaySrc ? (
        <UiEntity
          uiTransform={{
            positionType: "absolute",
            position: { top: 0, left: 0 },
            width: wh,
            height: wh,
          }}
          uiBackground={{
            texture: { src: displaySrc },
            textureMode: "stretch" as const,
          }}
        />
      ) : (
        <UiEntity
          uiText={{
            value: thumbnailPlaceholder(props.kind),
            fontSize: font.subtitle,
            color: color.textSecondary,
            textAlign: "middle-center",
          }}
        />
      )}
    </UiEntity>
  );
}
