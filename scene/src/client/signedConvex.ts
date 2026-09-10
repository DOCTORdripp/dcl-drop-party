import { signedFetch } from "~system/SignedFetch";
import { CONVEX_SITE_URL } from "../shared/constants";

export async function signedConvexPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${CONVEX_SITE_URL.replace(/\/$/, "")}${path}`;
  const payload = JSON.stringify(body);
  const response = await signedFetch({
    url,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    },
  });
  const json = (() => {
    try {
      return JSON.parse(response.body || "{}") as T & { error?: string };
    } catch {
      throw new Error(`Request failed (${response.status})`);
    }
  })();
  if (!response.ok) {
    const code = typeof json.error === "string" ? json.error.trim() : "";
    throw new Error(
      code.length > 0
        ? code.length <= 240
          ? code
          : `${code.slice(0, 237)}...`
        : `Request failed (${response.status})`,
    );
  }
  return json;
}
