export const BALLOON_CAPTCHA_SHAPES = ["round", "long", "heart", "dog"] as const;

export type BalloonCaptchaShape = (typeof BALLOON_CAPTCHA_SHAPES)[number];

export type TurnInCaptcha = {
  order: readonly BalloonCaptchaShape[];
  required: BalloonCaptchaShape;
  selected: BalloonCaptchaShape | null;
};

export function balloonCaptchaSrc(shape: BalloonCaptchaShape): string {
  const file =
    shape === "round"
      ? "balloonCaptchaRound"
      : shape === "long"
        ? "balloonCaptchaLong"
        : shape === "heart"
          ? "balloonCaptchaHeart"
          : "balloonCaptchaDog";
  return `assets/images/${file}.png`;
}

export function formatTurnInCaptchaPrompt(shape: BalloonCaptchaShape): string {
  const parts = turnInCaptchaPromptParts(shape);
  return `${parts.prefix}${parts.word}${parts.suffix}`;
}

export function turnInCaptchaPromptParts(shape: BalloonCaptchaShape): {
  prefix: string;
  word: string;
  suffix: string;
} {
  return {
    prefix: "Click the ",
    word: shape.toUpperCase(),
    suffix: " shaped balloon to continue.",
  };
}

export function createTurnInCaptcha(random: () => number = Math.random): TurnInCaptcha {
  const order = [...BALLOON_CAPTCHA_SHAPES];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const current = order[i]!;
    order[i] = order[j]!;
    order[j] = current;
  }
  const required = order[Math.floor(random() * order.length)]!;
  return { order, required, selected: null };
}

export function selectTurnInCaptcha(captcha: TurnInCaptcha, shape: BalloonCaptchaShape): TurnInCaptcha {
  return { ...captcha, selected: shape };
}

export function submitTurnInCaptcha(
  captcha: TurnInCaptcha,
): { ok: true } | { ok: false; captcha: TurnInCaptcha } {
  if (captcha.selected === captcha.required) {
    return { ok: true };
  }
  return { ok: false, captcha: { ...captcha, selected: null } };
}
