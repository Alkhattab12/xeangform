/**
 * Menentukan origin situs untuk emailRedirectTo.
 * Header `Origin` hanya dipercaya jika host-nya SAMA dengan host permintaan; selain itu dipakai env, lalu host permintaan.
 * (Supabase juga membatasi redirect lewat allow-list; ini lapisan tambahan agar tidak membentuk URL sembarang.)
 */
function parseOrigin(v: string | null | undefined): URL | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

export function pickSiteOrigin(input: {
  origin?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  envUrl?: string | null;
}): string {
  const reqHost = (input.forwardedHost || input.host || "").split(",")[0].trim().toLowerCase();
  const o = parseOrigin(input.origin);
  if (o && reqHost && o.host.toLowerCase() === reqHost) return o.origin;

  const env = parseOrigin(input.envUrl);
  if (env) return env.origin;

  if (reqHost && /^[a-z0-9.-]+(:\d{1,5})?$/.test(reqHost)) {
    const local = reqHost.startsWith("localhost") || reqHost.startsWith("127.0.0.1");
    const proto = (input.forwardedProto || "").split(",")[0].trim() === "http" || local ? "http" : "https";
    return `${proto}://${reqHost}`;
  }
  return "http://localhost:3000";
}
