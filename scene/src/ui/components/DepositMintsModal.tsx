import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import type { DepositChestItem } from "../../shared/chestPanels";
import {
  humanMintLabel,
  isMintLocked,
  sortMintsForPicker,
} from "../../shared/inventoryBrowser";
import { rgbaForRarityLabel } from "../rarityColors";
import { color, font, layout, radius, s, spacing } from "../theme";
import { RmButton } from "./Button";

const OPAQUE_BACKDROP = { r: 0.04, g: 0.05, b: 0.08, a: 0.97 };
const OPAQUE_CARD = { r: 0.1, g: 0.11, b: 0.15, a: 1 };
const OPAQUE_ROW = { r: 0.16, g: 0.18, b: 0.24, a: 1 };

export function DepositMintsModal(props: {
  item: DepositChestItem;
  selectedMints: readonly string[];
  quantity: number;
  lowMintLock: boolean;
  protectedMintNumbers: readonly number[];
  compact?: boolean;
  onClose: () => void;
  onToggleMint: (tokenId: string) => void;
  onConfirm: () => void;
}): ReactEcs.JSX.Element {
  const ordered = sortMintsForPicker(props.item);
  const kindLabel = props.item.kind === "emote" ? "Emote" : "Wearable";
  const rColor = rgbaForRarityLabel(props.item.rarity);
  const selCount = props.selectedMints.length;
  const actionSize = props.compact ? "touch" : "sm";
  return (
    <UiEntity
      uiTransform={{
        positionType: "absolute",
        position: { top: 0, left: 0 },
        width: layout.width,
        height: layout.height,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
      }}
    >
      <UiEntity
        uiTransform={{
          positionType: "absolute",
          position: { top: 0, left: 0 },
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
        uiBackground={{ color: OPAQUE_BACKDROP }}
        onMouseDown={props.onClose}
      />
      <UiEntity
        uiTransform={{
          zIndex: 1,
          width: Math.min(s(480), layout.width - spacing.lg * 2),
          minHeight: s(200),
          maxHeight: s(480),
          flexDirection: "column",
          padding: spacing.lg,
          borderRadius: radius.lg,
        }}
        uiBackground={{ color: OPAQUE_CARD }}
      >
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            margin: { bottom: spacing.sm },
            flexShrink: 0,
          }}
        >
          <UiEntity uiTransform={{ flexDirection: "column", flexGrow: 1, flexShrink: 1, margin: { right: spacing.sm } }}>
            <UiEntity
              uiTransform={{ width: "100%", minHeight: s(24) }}
              uiText={{
                value: props.item.name,
                fontSize: font.title,
                color: color.textPrimary,
                textAlign: "top-left",
              }}
            />
            <UiEntity uiTransform={{ width: "100%", minHeight: s(20), margin: { top: 4 } }}>
              <UiEntity
                uiText={{
                  value: `${kindLabel} · `,
                  fontSize: font.caption,
                  color: color.textMuted,
                  textAlign: "middle-left",
                }}
              />
              <UiEntity
                uiText={{
                  value: props.item.rarity,
                  fontSize: font.caption,
                  color: rColor,
                  textAlign: "middle-left",
                }}
              />
              <UiEntity
                uiText={{
                  value: ordered.length === 1 ? " · 1 mint" : ` · ${ordered.length} mints`,
                  fontSize: font.caption,
                  color: color.textMuted,
                  textAlign: "middle-left",
                }}
              />
            </UiEntity>
          </UiEntity>
          <RmButton label="×" variant="danger" size={actionSize} onClick={props.onClose} />
        </UiEntity>
        <UiEntity
          uiTransform={{ width: "100%", minHeight: s(28), margin: { bottom: spacing.sm }, flexShrink: 0 }}
          uiText={{
            value:
              selCount > 0
                ? `${selCount} selected · deposit ${props.quantity}`
                : "Select mint numbers to deposit",
            fontSize: font.micro,
            color: selCount > 0 ? color.accent : color.textMuted,
            textAlign: "top-left",
          }}
        />
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "column",
            overflow: "scroll",
            minHeight: s(120),
            maxHeight: s(280),
            flexShrink: 1,
          }}
        >
          {ordered.map((mint) => {
            const locked = isMintLocked(
              props.item,
              mint,
              props.lowMintLock,
              props.protectedMintNumbers,
            );
            const isSelected = props.selectedMints.includes(mint);
            return (
              <UiEntity
                uiTransform={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: { top: 6, bottom: 6, left: spacing.sm, right: spacing.sm },
                  margin: { bottom: 4 },
                  borderRadius: radius.md,
                }}
                uiBackground={{ color: OPAQUE_ROW }}
              >
                <UiEntity uiTransform={{ flexGrow: 1, flexShrink: 1, flexDirection: "row", alignItems: "center" }}>
                  <UiEntity
                    uiTransform={{ flexShrink: 1, minHeight: s(22) }}
                    uiText={{
                      value: humanMintLabel(props.item, mint),
                      fontSize: font.subtitle,
                      color: locked ? color.textMuted : color.textPrimary,
                      textAlign: "middle-left",
                    }}
                  />
                  {locked ? (
                    <UiEntity
                      uiTransform={{ margin: { left: spacing.xs }, flexShrink: 0, minHeight: s(18) }}
                      uiText={{
                        value: "X",
                        fontSize: font.caption,
                        color: color.textMuted,
                        textAlign: "middle-left",
                      }}
                    />
                  ) : null}
                </UiEntity>
                <RmButton
                  label={locked ? "LOCKED" : isSelected ? "SELECTED" : "SELECT"}
                  variant={locked ? "ghost" : isSelected ? "standby" : "primary"}
                  size={actionSize}
                  disabled={locked}
                  onClick={() => {
                    if (!locked) props.onToggleMint(mint);
                  }}
                />
              </UiEntity>
            );
          })}
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            margin: { top: spacing.md },
            flexShrink: 0,
          }}
        >
          <UiEntity
            uiTransform={{ flexGrow: 1, minHeight: s(20) }}
            uiText={{
              value: selCount === 0 ? "Select at least one mint" : `${selCount} selected`,
              fontSize: font.caption,
              color: selCount > 0 ? color.textPrimary : color.textMuted,
              textAlign: "middle-left",
            }}
          />
          <RmButton
            label={selCount === 0 ? "DEPOSIT" : `DEPOSIT ${selCount}`}
            variant="primary"
            size={actionSize}
            disabled={selCount === 0}
            onClick={props.onConfirm}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  );
}
