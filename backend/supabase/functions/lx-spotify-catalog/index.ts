import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

let cachedToken = "";
let tokenExpiresAt = 0;
let cachedCredentialFingerprint = "";

async function credentialFingerprint(clientId: string, clientSecret: string) {
  const bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function spotifyToken(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("lx_integrations")
    .select("key,secret")
    .in("key", ["spotify_client_id", "spotify_client_secret"]);
  if (error) throw new Error("Não foi possível carregar a integração Spotify.");
  const secrets = Object.fromEntries((data || []).map((row: { key: string; secret: string }) => [row.key, row.secret]));
  if (!secrets.spotify_client_id || !secrets.spotify_client_secret) {
    throw new Error("Spotify ainda não foi configurado pelo Dono.");
  }
  const fingerprint = await credentialFingerprint(secrets.spotify_client_id, secrets.spotify_client_secret);
  if (fingerprint === cachedCredentialFingerprint && cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }
  const auth = btoa(`${secrets.spotify_client_id}:${secrets.spotify_client_secret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error("O Spotify recusou as credenciais configuradas.");
  cachedToken = payload.access_token;
  cachedCredentialFingerprint = fingerprint;
  tokenExpiresAt = Date.now() + Number(payload.expires_in || 3600) * 1000;
  return cachedToken;
}

function safeId(value: unknown) {
  const id = String(value || "");
  return /^[A-Za-z0-9]{10,64}$/.test(id) ? id : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization) return json({ error: "Entre na LX Plus para pesquisar músicas." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await admin.from("lx_profiles").select("approved").eq("user_id", authData.user.id).maybeSingle();
    if (!profile?.approved) return json({ error: "Conta aguardando aprovação." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "search");
    const limit = Math.max(1, Math.min(Number(body.limit || 12), 20));
    const token = await spotifyToken(admin);
    let path = "";

    if (action === "search") {
      const q = String(body.q || "").trim().slice(0, 100);
      if (q.length < 2) return json({ error: "Digite pelo menos 2 caracteres." }, 400);
      path = `/v1/search?q=${encodeURIComponent(q)}&type=track,artist,album,playlist&market=BR&limit=${limit}`;
    } else if (action === "artist") {
      const id = safeId(body.id); if (!id) return json({ error: "Artista inválido." }, 400);
      const headers = { Authorization: `Bearer ${token}` };
      const responses = await Promise.all([
        fetch(`https://api.spotify.com/v1/artists/${id}`, { headers }),
        fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=BR`, { headers }),
        fetch(`https://api.spotify.com/v1/artists/${id}/albums?market=BR&include_groups=album,single&limit=20`, { headers }),
      ]);
      const [artist, tracks, albums] = await Promise.all(responses.map(r => r.json()));
      const failed = responses.find(r => !r.ok);
      if (failed) return json({ error: "O Spotify não disponibilizou os dados deste artista." }, failed.status);
      return json({ action, artist, tracks, albums, source: "spotify" });
    } else if (action === "album") {
      const id = safeId(body.id); if (!id) return json({ error: "Álbum inválido." }, 400);
      path = `/v1/albums/${id}?market=BR`;
    } else if (action === "playlist") {
      const id = safeId(body.id); if (!id) return json({ error: "Playlist inválida." }, 400);
      path = `/v1/playlists/${id}?market=BR`;
    } else {
      return json({ error: "Ação desconhecida." }, 400);
    }

    const response = await fetch(`https://api.spotify.com${path}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || "Falha no catálogo Spotify." }, response.status);
    return json({ action, data, source: "spotify" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha inesperada na integração." }, 500);
  }
});
