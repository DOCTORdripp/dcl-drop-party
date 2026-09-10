export function describeFetchFailure(args: {
  endpoint: string;
  status?: number;
  error?: unknown;
}): { endpoint: string; status?: number; error: string } {
  const raw = args.error instanceof Error ? args.error.message : String(args.error ?? "request failed");
  const error = raw
    .replace(/x-dropparty-signature\s*[:=]\s*\S+/gi, "[redacted]")
    .replace(/sessionId["']?\s*[:=]\s*["']?[0-9a-f]+/gi, "sessionId:[redacted]")
    .slice(0, 160);
  return { endpoint: args.endpoint, status: args.status, error };
}
