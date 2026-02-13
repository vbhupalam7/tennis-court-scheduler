import { useMemo, useState } from "react";

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

const AVAILABILITY_STORAGE_KEY = "tennis-squad-availability";

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

function useAvailability() {
  const [savedEntries, setSavedEntries] = useState<AvailabilityEntry[]>(() => {
    const raw = window.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (entry): entry is AvailabilityEntry =>
          typeof entry?.playerId === "number" && typeof entry?.gameId === "number"
      );
    } catch {
      return [];
    }
  });

  const [entries, setEntries] = useState<AvailabilityEntry[]>(() => {
    return savedEntries;
  });

  const hasUnsavedChanges = useMemo(() => {
    const draft = new Set(entries.map((entry) => `${entry.playerId}-${entry.gameId}`));
    const saved = new Set(savedEntries.map((entry) => `${entry.playerId}-${entry.gameId}`));

    if (draft.size !== saved.size) {
      return true;
    }

    for (const key of draft) {
      if (!saved.has(key)) {
        return true;
      }
    }

    return false;
  }, [entries, savedEntries]);

  const setAvailability = (playerId: number, gameId: number, available: boolean) => {
    setEntries((prev) => {
      const index = prev.findIndex(
        (e) => e.playerId === playerId && e.gameId === gameId
      );

      if (available && index === -1) {
        return [...prev, { playerId, gameId }];
      }

      if (!available && index >= 0) {
        const copy = [...prev];
        copy.splice(index, 1);
        return copy;
      }

      return prev;
    });
  };

  const isAvailable = (playerId: number, gameId: number) =>
    entries.some((e) => e.playerId === playerId && e.gameId === gameId);

  const clearAllEntries = () => setEntries([]);

  const saveEntries = () => {
    window.localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(entries));
    setSavedEntries(entries);
  };

  return {
    entries,
    setAvailability,
    isAvailable,
    clearAllEntries,
    hasUnsavedChanges,
    saveEntries,
  };
}

function useGameSummaries(
  players: Player[],
  games: Game[],
  entries: AvailabilityEntry[]
) {
  return useMemo(() => {
    return games.map((game) => {
      const availablePlayerIds = entries
        .filter((e) => e.gameId === game.id)
        .map((e) => e.playerId);
      const uniqueIds = Array.from(new Set(availablePlayerIds));
      const availablePlayers = uniqueIds
        .map((id) => players.find((p) => p.id === id))
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
  const {
    entries,
    setAvailability,
    isAvailable,
    clearAllEntries,
    hasUnsavedChanges,
    saveEntries,
  } =
    useAvailability();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    DEFAULT_PLAYERS[0]?.id ?? null
  );

  const gameSummaries = useGameSummaries(players, games, entries);

  const bestGame = useMemo(() => {
    const sorted = [...gameSummaries].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0] : null;
  }, [gameSummaries]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? players[0];

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
            {players.length} player{players.length !== 1 ? "s" : ""} · {games.length} game{games.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <div className="layout-grid">
        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <div>
                <div className="card-title">Squad &amp; Schedule</div>
                <div className="card-caption">
                  Your roster and upcoming matches.
                </div>
              </div>
              <div className="chip-row">
                <span className="chip chip-strong">
                  <span className="chip-count">
                    <span className="chip-count-dot" />
                    {players.length} players
                  </span>
                </span>
                <span className="chip">
                  <span className="chip-count">
                    <span className="chip-count-dot" />
                    {games.length} games
                  </span>
                </span>
              </div>
            </div>

            <div className="field">
              <label>Squad roster</label>
              <div className="list">
                {players.map((player) => (
                  <div key={player.id} className="pill-sm">
                    <strong>{player.name}</strong> · {player.city} · {player.rating}
                  </div>
                ))}
              </div>
            </div>

            <div className="section-divider" />

            <div className="field">
              <label>Upcoming matches</label>
              <div className="list">
                {games.map((game) => (
                  <div key={game.id} className="pill-sm">
                    <strong>vs {game.opponent}</strong> · {game.date} · {game.time} ·{" "}
                    <span className={game.homeAway === "Home" ? "home-badge" : "away-badge"}>
                      {game.homeAway}
                    </span>
                    {game.location ? ` · ${game.location}` : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <div>
                <div className="card-title">Who&apos;s available?</div>
                <div className="card-caption">
                  Choose Yes or No for each player and game.
                </div>
              </div>
            </div>

            <div className="field">
              <label>Editing for</label>
              <select
                className="select"
                value={selectedPlayer?.id ?? ""}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value) || null)}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tag-row">
              <span className="tag tag-available">
                <span className="tag-dot" />
                Use each dropdown to choose Yes or No availability.
              </span>
              {hasUnsavedChanges && (
                <button className="btn btn-save btn-sm" type="button" onClick={saveEntries}>
                  Save
                </button>
              )}
              {entries.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={clearAllEntries}
                >
                  Clear all
                </button>
              )}
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
                          onChange={(e) =>
                            setAvailability(player.id, game.id, e.target.value === "yes")
                          }
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
                  const summary = gameSummaries.find((s) => s.game.id === game.id);
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
                    <strong>Most available</strong>: vs {bestGame.game.opponent} on{" "}
                    {bestGame.game.date} at {bestGame.game.time} ({bestGame.game.homeAway} · {bestGame.game.location}) with{" "}
                    <strong>{bestGame.count}</strong> player{bestGame.count !== 1 ? "s" : ""}.
                  </div>
                  <div className="summary-row">
                    <div>
                      <div className="summary-label">Available players</div>
                      <div className="pill-row">
                        {bestGame.availablePlayers.map((p) => (
                          <span key={p.id} className="pill-sm pill-sm-strong">
                            {p.name}
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
              {hasUnsavedChanges
                ? "You have unsaved schedule updates. Click Save to keep them on this device."
                : "Schedule updates are saved on this device."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
