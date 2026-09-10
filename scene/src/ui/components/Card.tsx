import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import { PARTY_BACK_ARROW } from "../../shared/partyDisplay";
import { PANEL_BASE_WIDTH } from "../theme";
import { color, font, measureWrappedTextHeight, radius, s, spacing } from "../theme";

const CARD_BODY_DESIGN_WIDTH = PANEL_BASE_WIDTH - 24;

type Props = {
  title?: string;
  subtitle?: string;
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | false | null;
  padded?: boolean;
  elevated?: boolean;
  fill?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  compact?: boolean;
  /** Skip the solid card fill so a parent texture (deposit art) shows through. */
  plain?: boolean;
};

const HEADER_SIDE_DESKTOP = 28;
const HEADER_SIDE_COMPACT = 44;

function HeaderSide(args: { onClick?: () => void; label?: string; side: number }) {
  const transform = {
    width: s(args.side),
    height: s(args.side),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    flexShrink: 0,
  };
  const text = {
    value: args.label ?? "",
    fontSize: font.title,
    color: color.textMuted,
    textAlign: "middle-center" as const,
  };
  if (args.onClick) {
    return <UiEntity uiTransform={transform} uiText={text} onMouseDown={args.onClick} />;
  }
  return <UiEntity uiTransform={transform} uiText={text} />;
}

export function RmCard(props: Props): ReactEcs.JSX.Element {
  const headerSide = props.compact ? HEADER_SIDE_COMPACT : HEADER_SIDE_DESKTOP;
  const titleSize = props.compact ? 19 : 18;
  const titleBox = CARD_BODY_DESIGN_WIDTH - headerSide * 2;
  const titleH = props.title ? s(measureWrappedTextHeight(props.title, titleSize, titleBox)) : 0;
  const subtitleH = props.subtitle
    ? s(measureWrappedTextHeight(props.subtitle, 11, CARD_BODY_DESIGN_WIDTH))
    : 0;
  const showHeader = Boolean(props.title || props.onClose || props.onBack);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        height: props.fill ? "100%" : "auto",
        flexDirection: "column",
        padding: props.padded === false ? 0 : props.compact ? spacing.sm : spacing.md,
        margin: props.fill ? { top: 0, right: 0, bottom: 0, left: 0 } : { bottom: props.compact ? spacing.xs : spacing.sm },
        borderRadius: radius.lg,
        overflow: props.fill ? undefined : "hidden",
      }}
      uiBackground={{
        color: props.plain
          ? Color4.create(0, 0, 0, 0)
          : props.elevated
            ? color.bgElevated
            : color.surface,
      }}
    >
      {showHeader ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "column",
            margin: { bottom: props.compact ? spacing.xs : spacing.sm },
            flexShrink: 0,
          }}
        >
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {props.onBack ? (
              <HeaderSide side={headerSide} label={PARTY_BACK_ARROW} onClick={props.onBack} />
            ) : (
              <HeaderSide side={headerSide} />
            )}
            {props.title ? (
              <UiEntity
                uiTransform={{ flexGrow: 1, height: titleH, flexShrink: 1 }}
                uiText={{
                  value: props.title,
                  fontSize: titleSize,
                  color: color.textPrimary,
                  textAlign: "middle-left",
                  textWrap: "wrap",
                }}
              />
            ) : (
              <UiEntity uiTransform={{ flexGrow: 1, height: 1 }} />
            )}
            {props.onClose ? (
              <HeaderSide side={headerSide} label="×" onClick={props.onClose} />
            ) : (
              <HeaderSide side={headerSide} />
            )}
          </UiEntity>
          {props.subtitle ? (
            <UiEntity
              uiTransform={{ width: "100%", height: subtitleH, margin: { top: 2 }, flexShrink: 0 }}
              uiText={{
                value: props.subtitle,
                fontSize: font.caption,
                color: color.textMuted,
                textAlign: "top-center",
                textWrap: "wrap",
              }}
            />
          ) : null}
        </UiEntity>
      ) : null}
      {props.children}
    </UiEntity>
  );
}
