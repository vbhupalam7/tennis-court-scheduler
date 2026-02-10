import { useMemo, useState } from "react";

type TimeOfDay = "morning" | "afternoon" | "evening";

interface Player {
  id: number;
  name: string;
  ranking: number;
}

interface Court {
  id: number;
  name: string;
  address: string;
  distanceKm: number;
}

interface AvailabilityEntry {
  playerId: number;
  courtId: number;
  day: string;
  slot: TimeOfDay;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const DEFAULT_PLAYERS: Player[] = [
  "You",
  "Teammate 1",
  "Teammate 2",
  "Teammate 3",
  "Teammate 4",
  "Teammate 5",
  "Teammate 6",
  "Teammate 7",
  "Teammate 8",
  "Teammate 9",
].map((name, index) => ({ id: index + 1, name, ranking: index + 1 }));

const DEFAULT_COURTS: Court[] = [
  {
    id: 1,
    name: "Emerald Glen Park",
    address: "Tassajara Rd & Central Pkwy, Dublin, CA",
    distanceKm: 0.8,
  },
  {
    id: 2,
    name: "Fallon Sports Park",
    address: "Lockhart St, Dublin, CA",
    distanceKm: 2.0,
  },
  {
    id: 3,
    name: "Dublin High School Courts",
    address: "Village Pkwy, Dublin, CA",
    distanceKm: 0.5,
  },
  {
    id: 4,
    name: "Shannon Park Courts",
    address: "Shannon Ave, Dublin, CA",
    distanceKm: 1.2,
  },
  {
    id: 5,
    name: "Kolb Park Courts",
    address: "Bristol Rd, Dublin, CA",
    distanceKm: 1.0,
  },
];

function usePlayers() {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const addPlayer = (name: string, ranking?: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((prev) => {
      if (prev.length >= 20) return prev;
      const nextId = (prev.at(-1)?.id ?? 0) + 1;
      const nextRank = typeof ranking === "number" && !Number.isNaN(ranking) ? ranking : nextId;
      return [...prev, { id: nextId, name: trimmed, ranking: nextRank }];
    });
  };
  const updatePlayerRanking = (playerId: number, ranking: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, ranking } : p))
    );
  };
  return { players, addPlayer, updatePlayerRanking };
}

function useCourts() {
  const [courts, setCourts] = useState<Court[]>(DEFAULT_COURTS);
  const addCourt = (name: string, address: string, distanceKm?: number) => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName) return;
    setCourts((prev) => {
      const nextId = (prev.at(-1)?.id ?? 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          name: trimmedName,
          address: trimmedAddress || "Custom court",
          distanceKm: typeof distanceKm === "number" && !Number.isNaN(distanceKm) ? distanceKm : 3,
        },
      ];
    });
  };
  return { courts, addCourt };
}

function useAvailability() {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);

  const toggle = (entry: AvailabilityEntry) => {
    setEntries((prev) => {
      const index = prev.findIndex(
        (e) =>
          e.playerId === entry.playerId &&
          e.courtId === entry.courtId &&
          e.day === entry.day &&
          e.slot === entry.slot
      );
      if (index >= 0) {
        const copy = [...prev];
        copy.splice(index, 1);
        return copy;
      }
      return [...prev, entry];
    });
  };

  return { entries, toggle };
}

function useSuggestedSession(
  players: Player[],
  courts: Court[],
  entries: AvailabilityEntry[],
  maxDistanceKm: number
) {
  return useMemo(() => {
    if (!players.length || !courts.length) return null;

    const eligibleCourts = courts.filter((c) => c.distanceKm <= maxDistanceKm);
    if (!eligibleCourts.length) return null;

    let best:
      | {
          court: Court;
          day: string;
          slot: TimeOfDay;
          playerIds: number[];
        }
      | null = null;

    for (const court of eligibleCourts) {
      for (const day of DAYS) {
        for (const slot of ["morning", "afternoon", "evening"] as TimeOfDay[]) {
          const availableHere = entries.filter(
            (e) => e.courtId === court.id && e.day === day && e.slot === slot
          );
          if (!availableHere.length) continue;

          const uniquePlayerIds = Array.from(new Set(availableHere.map((e) => e.playerId)));

          if (!best || uniquePlayerIds.length > best.playerIds.length) {
            best = {
              court,
              day,
              slot,
              playerIds: uniquePlayerIds,
            };
          }
        }
      }
    }

    if (!best) return null;

    const slotLabel =
      best.slot === "morning" ? "7–11am" : best.slot === "afternoon" ? "12–4pm" : "5–9pm";

    return {
      court: best.court,
      day: best.day,
      slot: best.slot,
      slotLabel,
      playerNames: best.playerIds
        .map((id) => players.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[],
    };
  }, [players, courts, entries, maxDistanceKm]);
}

function App() {
  const { players, addPlayer, updatePlayerRanking } = usePlayers();
  const { courts, addCourt } = useCourts();
  const { entries, toggle } = useAvailability();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtAddress, setNewCourtAddress] = useState("");
  const [newCourtDistance, setNewCourtDistance] = useState("");

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    DEFAULT_PLAYERS[0]?.id ?? null
  );
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(
    DEFAULT_COURTS[0]?.id ?? null
  );
  const [selectedDay, setSelectedDay] = useState<string>("Sat");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(5);

  const suggested = useSuggestedSession(players, courts, entries, maxDistanceKm);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    addPlayer(newPlayerName);
    setNewPlayerName("");
  };

  const handleAddCourt = () => {
    if (!newCourtName.trim()) return;
    const parsedDistance = Number.parseFloat(newCourtDistance);
    addCourt(newCourtName, newCourtAddress, parsedDistance);
    setNewCourtName("");
    setNewCourtAddress("");
    setNewCourtDistance("");
  };

  const toggleSlot = (slot: TimeOfDay) => {
    if (!selectedPlayerId || !selectedCourtId) return;
    toggle({ playerId: selectedPlayerId, courtId: selectedCourtId, day: selectedDay, slot });
  };

  const isSlotSelected = (playerId: number, day: string, slot: TimeOfDay) =>
    entries.some(
      (e) => e.playerId === playerId && e.day === day && e.slot === slot && e.courtId === selectedCourtId
    );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? players[0];
  const selectedCourt = courts.find((c) => c.id === selectedCourtId) ?? courts[0];

  const totalPlayers = players.length;
  const totalCourtsNearby = courts.filter((c) => c.distanceKm <= maxDistanceKm).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">Tennis Squad Planner</div>
          <div className="app-subtitle">
            Plan team sessions by who&apos;s free and which courts are closest.
          </div>
        </div>
        <div className="pill">
          <span className="pill-dot" />
          <span>10-player squad ready</span>
        </div>
      </header>

      <div className="layout-grid">
        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <div>
                <div className="card-title">Team & Courts</div>
                <div className="card-caption">
                  Add your players and nearby courts (with rough distance).
                </div>
              </div>
              <div className="chip-row">
                <span className="chip chip-strong">
                  <span className="chip-count">
                    <span className="chip-count-dot" />
                    {totalPlayers} players
                  </span>
                </span>
                <span className="chip">
                  <span className="chip-count">
                    <span className="chip-count-dot" />
                    {courts.length} courts saved
                  </span>
                </span>
              </div>
            </div>

            <div className="field">
              <label>Quick add teammate</label>
              <div className="inline-row">
                <div className="field">
                  <input
                    className="input"
                    placeholder="Name (e.g. Alex)"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddPlayer();
                    }}
                  />
                </div>
                <button className="btn" type="button" onClick={handleAddPlayer}>
                  <span className="icon">+</span>
                  Add
                </button>
              </div>
            </div>

            <div className="section-divider" />

            <div className="field">
              <label>Nearby court</label>
              <div className="inline-row">
                <div className="field">
                  <input
                    className="input"
                    placeholder="Court name"
                    value={newCourtName}
                    onChange={(e) => setNewCourtName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <input
                    className="input"
                    placeholder="Distance mi"
                    value={newCourtDistance}
                    onChange={(e) => setNewCourtDistance(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <input
                  className="input"
                  placeholder="Address / notes (optional)"
                  value={newCourtAddress}
                  onChange={(e) => setNewCourtAddress(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary" type="button" onClick={handleAddCourt}>
                <span className="icon">+</span>Add court
              </button>
            </div>

            <div className="section-divider" />

            <div className="field">
              <label>Saved courts</label>
              <div className="list">
                {courts.length === 0 ? (
                  <div className="list-empty">No courts yet. Add at least one.</div>
                ) : (
                  courts.map((court) => (
                    <div key={court.id} className="pill-sm">
                      <strong>{court.name}</strong> · {court.distanceKm.toFixed(1)} mi ·{" "}
                      <span>{court.address}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-inner">
            <div className="card-header">
              <div>
                <div className="card-title">Who&apos;s free where?</div>
                <div className="card-caption">
                  Pick a teammate, day, court and mark when they&apos;re available.
                </div>
              </div>
              <div className="chip-row">
                <span className="chip">
                  Distance filter:{" "}
                  <strong style={{ marginLeft: 4 }}>{maxDistanceKm.toFixed(1)} mi</strong>
                </span>
              </div>
            </div>

            <div className="inline-row">
              <div className="field">
                <label>Player</label>
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

              <div className="field">
                <label>Court</label>
                <select
                  className="select"
                  value={selectedCourt?.id ?? ""}
                  onChange={(e) => setSelectedCourtId(Number(e.target.value) || null)}
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.distanceKm.toFixed(1)} mi
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="inline-row">
              <div className="field">
                <label>Day</label>
                <select
                  className="select"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Max distance (mi)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={30}
                  value={maxDistanceKm}
                  onChange={(e) =>
                    setMaxDistanceKm(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
                  }
                />
              </div>
            </div>

            <div className="tag-row">
              <span className="tag tag-available">
                <span className="tag-dot" />
                {selectedPlayer?.name ?? "Player"} at {selectedCourt?.name ?? "court"} on{" "}
                {selectedDay}
              </span>
              <span className="tag">
                <span className="tag-dot" />
                Toggle time windows below to mark availability.
              </span>
            </div>

            <div className="section-divider" />

            <div className="availability-grid">
              <div className="availability-grid-header">
                <div>Player</div>
                <div>Player ranking</div>
                <div>Morning</div>
                <div>Afternoon</div>
                <div>Evening</div>
              </div>
              {players.map((player) => (
                <div className="availability-grid-row" key={player.id}>
                  <div className="availability-name">{player.name}</div>
                  <div className="availability-ranking">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="ranking-input"
                      value={player.ranking}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) updatePlayerRanking(player.id, Math.max(1, Math.min(99, v)));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {(["morning", "afternoon", "evening"] as TimeOfDay[]).map((slot) => {
                    const active = isSlotSelected(player.id, selectedDay, slot);
                    const label =
                      slot === "morning" ? "7–11" : slot === "afternoon" ? "12–4" : "5–9";
                    return (
                      <div key={slot} onClick={() => player.id === selectedPlayerId && toggleSlot(slot)}>
                        {active ? (
                          <span className="slot-pill">
                            <span className="dot" />
                            <span>{label}</span>
                            <span className="court">{selectedCourt?.name ?? ""}</span>
                          </span>
                        ) : (
                          <span className="slot-empty">{label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="summary">
              {suggested ? (
                <>
                  <div className="summary-main">
                    <strong>Best session</strong> within {maxDistanceKm.toFixed(1)} mi:{" "}
                    <span>{suggested.day}</span>{" "}
                    <span>
                      {suggested.slotLabel} at {suggested.court.name}
                    </span>{" "}
                    with <strong>{suggested.playerNames.length}</strong> available players.
                  </div>
                  <div className="summary-row">
                    <div>
                      <div className="summary-label">Squad for this slot</div>
                      <div className="pill-row">
                        {suggested.playerNames.map((name) => (
                          <span key={name} className="pill-sm pill-sm-strong">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="summary-label">Court</div>
                      <div className="summary-chip-strong summary-chip">
                        {suggested.court.name} · {suggested.court.distanceKm.toFixed(1)} mi
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="summary-main">
                  Mark a few availability slots, then I&apos;ll highlight the best day, time and
                  nearby court for your squad.
                </div>
              )}
            </div>

            <div className="footer-note">
              Everything is stored in memory for now. Once you like the flow, we can plug this into
              a backend or sync via a shared link for your <span>10-player</span> team.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

