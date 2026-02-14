import { useEffect, useMemo, useRef, useState } from "react";
import {
  isSupabaseConfigured,
  loadAvailabilityFromSupabase,
  saveAvailabilityToSupabase,
} from "./supabaseAvailability";

interface Player {
  id: number;
  name: string;
  city: string;
  rating: string;
}

interface Game {
  id: number;
  opponent: string;
  date: string;
  time: string;
  homeAway: "Home" | "Away";
  location: string;
}

interface AvailabilityEntry {
  playerId: number;
  gameId: number;
}

const LOCAL_STORAGE_KEY = "tennis-court-availability";

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: "Ankoti, Digvijay", city: "San Ramon", rating: "3.5C" },
  { id: 2, name: "Bejjanki, Raghupal", city: "Pleasanton", rating: "3.5C" },
  { id: 3, name: "Bhupalam, Vikas", city: "Dublin", rating: "3.5C" },
  { id: 4, name: "Billapati, Anil", city: "San Ramon", rating: "3.0C" },
  { id: 5, name: "Boral, John", city: "Walnut Creek", rating: "3.5C" },
  { id: 6, name: "Chanda, Shanker", city: "Pleasanton", rating: "3.5C" },
  { id: 7, name: "Chinta, Shiva Kumar", city: "Pleasanton", rating: "3.5S" },
  { id: 8, name: "Ham, Oscar", city: "Dublin", rating: "3.0C" },
  { id: 9, name: "Hari, Siva", city: "Sunnyvale", rating: "3.0C" },
  { id: 10, name: "Hariharaiyer, Sivakumar", city: "Dublin", rating: "3.5C" },
  { id: 11, name: "Kattamedi, Venkata", city: "Dublin", rating: "3.0C" },
  { id: 12, name: "Lakinana, Manoj", city: "Dublin", rating: "3.0C" },
  { id: 13, name: "Mandepudi, Srinivasa", city: "Dublin", rating: "3.5C" },
  { id: 14, name: "Nyamagoudar, Maheshkumar", city: "San Ramon", rating: "3.0C" },
  { id: 15, name: "Seshadri, Sunil", city: "Castro Valley", rating: "3.5C" },
  { id: 16, name: "Sharma, Sumit", city: "Dublin", rating: "3.5C" },
  { id: 17, name: "Singh, Dinesh", city: "Dublin", rating: "3.5C" },
  { id: 18, name: "Singh, Kulbir", city: "Dublin", rating: "3.5C" },
  { id: 19, name: "Vib, Anish", city: "San Ramon", rating: "3.0C" },
];

const GAMES: Game[] = [
  {
    id: 1,
    opponent: "Crow Canyon CC",
    date: "Feb 15",
    time: "11:00 AM",
    homeAway: "Away",
    location: "Crow Canyon CC",
  },
  {
    id: 2,
    opponent: "Blackhawk CC",
    date: "Feb 21",
    time: "12:30 PM",
    homeAway: "Away",
    location: "Blackhawk CC",
  },
  {
    id: 3,
    opponent: "Dougherty Valley HS",
    date: "Feb 28",
    time: "11:00 AM",
    homeAway: "Home",
    location: "PTC",
  },
  {
    id: 4,
    opponent: "Fremont TC",
    date: "Mar 5",
    time: "6:30 PM",
    homeAway: "Away",
    location: "FTC",
  },
];

function normalizeEntries(value: unknown): AvailabilityEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, AvailabilityEntry>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const playerId = Number((item as Record<string, unknown>).playerId);
    const gameId = Number((item as Record<string, unknown>).gameId);

    if (!Number.isInteger(playerId) || !Number.isInteger(gameId)) {
      continue;
    }

    if (playerId <= 0 || gameId <= 0) {
      continue;
    }

    deduped.set(`${playerId}:${gameId}`, { playerId, gameId });
  }

  return [...deduped.values()];
}

function readEntriesFromLocalStorage(): AvailabilityEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeEntries(JSON.parse(raw));
  } catch (error) {
    console.error("[localStorage.read]", error);
    return [];
  }
}

function writeEntriesToLocalStorage(entries: AvailabilityEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("[localStorage.write]", error);
  }
}

function useGameSummaries(
  players: Player[],
  games: Game[],
  entries: AvailabilityEntry[]
) {
  return useMemo(() => {
    return games.map((game) => {
      const availablePlayerIds = entries
        .filter((entry) => entry.gameId === game.id)
        .map((entry) => entry.playerId);

      const uniqueIds = Array.from(new Set(availablePlayerIds));
      const availablePlayers = uniqueIds
        .map((id) => players.find((player) => player.id === id))
        .filter(Boolean) as Player[];

      return {
        game,
        availablePlayers,
        count: availablePlayers.length,
      };
    });
  }, [players, games, entries]);
}

function App() {
  const players = DEFAULT_PLAYERS;
  const games = GAMES;

  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    DEFAULT_PLAYERS[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");

  const hasLoadedAvailability = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      setIsLoading(true);

      try {
        const supabaseEntries = await loadAvailabilityFromSupabase();
        const serverEntries = normalizeEntries(supabaseEntries);

        setEntries(serverEntries);
        writeEntriesToLocalStorage(serverEntries);
        setStatusMessage("Shared availability loaded from Supabase.");
        setStatusType("info");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[availability.load]", error);
        const localEntries = readEntriesFromLocalStorage();
        setEntries(localEntries);

        if (!isSupabaseConfigured()) {
          setStatusMessage(
            "Supabase is not configured for this site build. Showing local device data only."
          );
        } else if (localEntries.length > 0) {
          setStatusMessage(
            "Supabase is unavailable. Showing last saved data from this device."
          );
        } else {
          setStatusMessage("Supabase is unavailable. Starting with an empty schedule.");
        }

        setStatusType("error");
      } finally {
        if (!controller.signal.aborted) {
          hasLoadedAvailability.current = true;
          setIsLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedAvailability.current || isLoading) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSaving(true);

      try {
        await saveAvailabilityToSupabase(entries);

        writeEntriesToLocalStorage(entries);

        if (!cancelled) {
          setStatusMessage("Changes synced to Supabase.");
          setStatusType("info");
        }
      } catch (error) {
        console.error("[availability.save]", error);
        writeEntriesToLocalStorage(entries);

        if (!cancelled) {
          setStatusMessage(
            "Could not sync to Supabase. Changes were saved on this device only."
          );
          setStatusType("error");
        }
      } finally {
        if (!cancelled) {
          setIsSaving(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [entries, isLoading]);

  const saveNow = async () => {
    if (isLoading || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await saveAvailabilityToSupabase(entries);

      writeEntriesToLocalStorage(entries);
      setStatusMessage("Changes saved to Supabase.");
      setStatusType("info");
    } catch (error) {
      console.error("[availability.saveNow]", error);
      writeEntriesToLocalStorage(entries);
      setStatusMessage(
        "Could not sync to Supabase. Changes were saved on this device only."
      );
      setStatusType("error");
    } finally {
      setIsSaving(false);
    }
  };

  const setAvailability = (playerId: number, gameId: number, available: boolean) => {
    setEntries((previousEntries) => {
      const index = previousEntries.findIndex(
        (entry) => entry.playerId === playerId && entry.gameId === gameId
      );

      if (available && index < 0) {
        return [...previousEntries, { playerId, gameId }];
      }

      if (!available && index >= 0) {
        const nextEntries = [...previousEntries];
        nextEntries.splice(index, 1);
        return nextEntries;
      }

      return previousEntries;
    });
  };

  const isAvailable = (playerId: number, gameId: number) => {
    return entries.some(
      (entry) => entry.playerId === playerId && entry.gameId === gameId
    );
  };

  const gameSummaries = useGameSummaries(players, games, entries);

  const bestGame = useMemo(() => {
    const sorted = [...gameSummaries].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0] : null;
  }, [gameSummaries]);

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">Tennis Squad Planner</div>
          <div className="app-subtitle">
            Mark player availability for upcoming matches.
          </div>
        </div>
        <div className="pill">
          <span className="pill-dot" />
          <span>
            {players.length} player{players.length !== 1 ? "s" : ""} · {games.length} game
            {games.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {statusMessage && (
        <div
          className={`status-banner ${statusType === "error" ? "status-error" : "status-info"}`}
          role={statusType === "error" ? "alert" : "status"}
        >
          {statusMessage}
        </div>
      )}

      <div className="layout-grid layout-grid-centered">
        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <div>
                <div className="card-title">Who&apos;s available?</div>
                <div className="card-caption">
                  Use each dropdown to choose Yes or No availability.
                </div>
              </div>
              <div className="sync-indicator">{isLoading ? "Loading..." : isSaving ? "Syncing..." : "Synced"}</div>
            </div>

            <div className="field">
              <label>Editing for</label>
              <select
                className="select"
                value={selectedPlayer?.id ?? ""}
                onChange={(event) => {
                  const nextId = Number(event.target.value);
                  setSelectedPlayerId(Number.isInteger(nextId) ? nextId : null);
                }}
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tag-row">
              <span className="tag tag-available">
                <span className="tag-dot" />
                Use each dropdown to choose Yes or No for every player and game.
              </span>
              <button
                className="btn btn-save btn-sm"
                type="button"
                onClick={saveNow}
                disabled={isLoading || isSaving}
              >
                Save now
              </button>
            </div>

            <div className="section-divider" />

            <div className="availability-grid">
              <div className="availability-grid-header">
                <div>Player</div>
                <div>Rating</div>
                {games.map((game) => (
                  <div key={game.id} className="game-col-header">
                    <span className="game-col-opponent">vs {game.opponent}</span>
                    <span className="game-col-date">{game.date}</span>
                    <span className="game-col-time">{game.time}</span>
                  </div>
                ))}
              </div>
              {players.map((player) => (
                <div className="availability-grid-row" key={player.id}>
                  <div className="availability-name">{player.name}</div>
                  <div className="availability-ranking">{player.rating}</div>
                  {games.map((game) => {
                    const active = isAvailable(player.id, game.id);

                    return (
                      <div
                        key={game.id}
                        className="game-cell game-cell-editable"
                      >
                        <select
                          className="cell-select"
                          value={active ? "yes" : "no"}
                          onChange={(event) =>
                            setAvailability(player.id, game.id, event.target.value === "yes")
                          }
                          disabled={isLoading}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="availability-grid-footer">
                <div className="availability-footer-label">Available</div>
                <div />
                {games.map((game) => {
                  const summary = gameSummaries.find((item) => item.game.id === game.id);
                  return (
                    <div key={game.id} className="availability-footer-count">
                      <strong>{summary?.count ?? 0}</strong> / {players.length}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="summary">
              {bestGame ? (
                <>
                  <div className="summary-main">
                    <strong>Most available</strong>: vs {bestGame.game.opponent} on {bestGame.game.date}
                    at {bestGame.game.time} ({bestGame.game.homeAway} · {bestGame.game.location}) with
                    <strong> {bestGame.count}</strong> player{bestGame.count !== 1 ? "s" : ""}.
                  </div>
                  <div className="summary-row">
                    <div>
                      <div className="summary-label">Available players</div>
                      <div className="pill-row">
                        {bestGame.availablePlayers.map((player) => (
                          <span key={player.id} className="pill-sm pill-sm-strong">
                            {player.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="summary-main">
                  Mark availability for each game above to see which match has the best turnout.
                </div>
              )}
            </div>

            <div className="footer-note">
              Availability is persisted to Supabase (when configured), with local-device fallback
              when the shared backend is unavailable.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
