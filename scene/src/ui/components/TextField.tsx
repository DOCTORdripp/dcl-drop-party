import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { Input, UiEntity } from "@dcl/sdk/react-ecs";
import { color, font, radius, s, spacing } from "../theme";

const INPUT_TEXT = { r: 0.05, g: 0.06, b: 0.09, a: 1 };
/** Desktop Input paints native chrome; mobile Explorer Input is text-only unless we fill this. */
const INPUT_FILL = Color4.create(0.97, 0.97, 0.99, 1);

export type TextFieldSize = "sm" | "md" | "lg";

function fieldMetrics(size: TextFieldSize) {
  switch (size) {
    case "sm":
      return { height: s(28), fontSize: font.caption };
    case "md":
      return { height: s(36), fontSize: font.body };
    case "lg":
      return { height: s(48), fontSize: font.subtitle };
  }
}

export function RmTextField(props: {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  width?: number | `${number}%` | "auto";
  compact?: boolean;
  size?: TextFieldSize;
  maxLength?: number;
  clearable?: boolean;
}): ReactEcs.JSX.Element {
  const size = props.size ?? (props.compact ? "sm" : "md");
  const metrics = fieldMetrics(size);
  const rowH = metrics.height;
  const fSize = metrics.fontSize;
  const maxLength = props.maxLength;
  const displayValue =
    maxLength !== undefined ? (props.value ?? "").slice(0, maxLength) : props.value;
  const showClear = Boolean(props.clearable && displayValue?.trim());
  const [inputGen, setInputGen] = ReactEcs.useState(0);
  const applyValue = (value: string) => {
    if (maxLength === undefined) {
      props.onChange(value);
      return;
    }
    const next = value.slice(0, maxLength);
    props.onChange(next);
    // DCL Input keeps its own focused buffer and will not show a shorter `value`.
    // Remount so characters past the cap never stay in the field.
    if (value.length > maxLength) {
      setInputGen(inputGen + 1);
    }
  };
  return (
    <UiEntity
      uiTransform={{
        width: props.width ?? "100%",
        flexDirection: "row",
        alignItems: "center",
        minHeight: rowH,
        flexShrink: 0,
        margin: { bottom: size === "sm" ? 0 : spacing.xs },
      }}
    >
      <UiEntity
        key={`field-${inputGen}`}
        uiTransform={{
          flexGrow: 1,
          minWidth: 0,
          height: rowH,
          borderRadius: radius.md,
          padding: { left: spacing.sm, right: showClear ? s(4) : spacing.sm },
        }}
        uiBackground={{ color: INPUT_FILL }}
      >
        <Input
          placeholder={props.placeholder ?? ""}
          placeholderColor={{ r: 0.35, g: 0.38, b: 0.45, a: 1 }}
          color={INPUT_TEXT}
          fontSize={fSize}
          value={displayValue}
          onChange={applyValue}
          onSubmit={applyValue}
          uiTransform={{ width: "100%", height: rowH }}
          uiBackground={{ color: INPUT_FILL }}
        />
      </UiEntity>
      {showClear ? (
        <UiEntity
          uiTransform={{
            width: props.compact ? s(24) : s(28),
            height: props.compact ? s(24) : s(28),
            margin: { left: s(4) },
            flexShrink: 0,
            borderRadius: radius.sm,
            alignItems: "center",
            justifyContent: "center",
          }}
          uiBackground={{ color: color.surfaceSoft }}
          uiText={{
            value: "×",
            fontSize: font.title,
            color: color.textMuted,
            textAlign: "middle-center",
          }}
          onMouseDown={() => props.onChange("")}
        />
      ) : null}
    </UiEntity>
  );
}
