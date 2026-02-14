interface AvailabilityEntry {
  playerId: number;
  gameId: number;
}

interface SupabaseRow {
  skill_level: string;
  player_id: number;
  game_id: number;
}

type SkillLevel = "3.5" | "3.0";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function getHeaders(contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY ?? "",
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ""}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

function getEndpoint(pathWithQuery: string): string {
  return `${SUPABASE_URL}/rest/v1/${pathWithQuery}`;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function loadAvailabilityFromSupabase(
  skillLevel: SkillLevel
): Promise<AvailabilityEntry[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are missing");
  }

  const response = await fetch(
    getEndpoint(
      `availability_entries?select=skill_level,player_id,game_id&skill_level=eq.${skillLevel}&order=player_id.asc,game_id.asc`
    ),
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase load failed (${response.status})`);
  }

  const rows = (await response.json()) as SupabaseRow[];

  return rows.map((row) => ({
    playerId: row.player_id,
    gameId: row.game_id,
  }));
}

export async function saveAvailabilityToSupabase(
  skillLevel: SkillLevel,
  entries: AvailabilityEntry[]
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are missing");
  }

  const deleteResponse = await fetch(
    getEndpoint(`availability_entries?skill_level=eq.${skillLevel}`),
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!deleteResponse.ok) {
    throw new Error(`Supabase clear failed (${deleteResponse.status})`);
  }

  if (!entries.length) {
    return;
  }

  const body = entries.map((entry) => ({
    skill_level: skillLevel,
    player_id: entry.playerId,
    game_id: entry.gameId,
  }));

  const insertResponse = await fetch(getEndpoint("availability_entries"), {
    method: "POST",
    headers: {
      ...getHeaders("application/json"),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });

  if (!insertResponse.ok) {
    throw new Error(`Supabase save failed (${insertResponse.status})`);
  }
}
