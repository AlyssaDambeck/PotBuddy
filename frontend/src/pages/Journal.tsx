import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import "./Journal.css";

type PlantHealthStatus =
  | "healthy"
  | "needs-attention"
  | "sick"
  | "recovering"
  | "dormant"
  | "dead";

type CurrentUser = {
  _id: string;
  username: string;
  email: string;
};

type PlantSpecies = {
  _id?: string;
  commonName?: string;
  scientificName?: string;
};

type UserPlant = {
  _id: string;
  nickname: string;
  speciesId?: PlantSpecies | string | null;
  healthStatus?: PlantHealthStatus | null;
};

type PopulatedJournalPlant = {
  _id: string;
  nickname: string;
  speciesId?: PlantSpecies | string | null;
};

type JournalPhoto = {
  fileId: string;
  filename: string;
  contentType: string;
  caption?: string | null;
};

type JournalEntryApi = {
  _id: string;
  ownerId?: string;
  userPlantId: PopulatedJournalPlant | string;
  title?: string | null;
  body: string;
  healthStatus?: PlantHealthStatus | null;
  watered: boolean;
  entryDate: string;
  photos: JournalPhoto[];
  createdAt?: string;
  updatedAt?: string;
};

type JournalEntry = {
  id: string;
  userPlantId: string;
  date: string;
  entryDate: string;
  title: string;
  plantName: string;
  species: string;
  healthStatus: PlantHealthStatus | null;
  notes: string;
  watered: boolean;
};

type JournalDraft = {
  date: string;
  title: string;
  userPlantId: string;
  healthStatus: PlantHealthStatus;
  notes: string;
  watered: boolean;
};

const healthOptions: Array<{
  value: PlantHealthStatus;
  label: string;
}> = [
  { value: "healthy", label: "Healthy" },
  { value: "needs-attention", label: "Needs attention" },
  { value: "sick", label: "Sick" },
  { value: "recovering", label: "Recovering" },
  { value: "dormant", label: "Dormant" },
  { value: "dead", label: "Dead" },
];

function todayInputValue(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function createEmptyDraft(userPlantId = ""): JournalDraft {
  return {
    date: todayInputValue(),
    title: "",
    userPlantId,
    healthStatus: "healthy",
    notes: "",
    watered: false,
  };
}

function normalizeCurrentUser(data: unknown): CurrentUser {
  if (
    typeof data === "object" &&
    data !== null &&
    "user" in data &&
    typeof (data as { user?: unknown }).user === "object"
  ) {
    return (data as { user: CurrentUser }).user;
  }

  return data as CurrentUser;
}

function normalizePlants(data: unknown): UserPlant[] {
  if (Array.isArray(data)) {
    return data as UserPlant[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "plants" in data &&
    Array.isArray((data as { plants?: unknown }).plants)
  ) {
    return (data as { plants: UserPlant[] }).plants;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "userPlants" in data &&
    Array.isArray((data as { userPlants?: unknown }).userPlants)
  ) {
    return (data as { userPlants: UserPlant[] }).userPlants;
  }

  return [];
}

function normalizeJournalEntries(data: unknown): JournalEntryApi[] {
  if (Array.isArray(data)) {
    return data as JournalEntryApi[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "entries" in data &&
    Array.isArray((data as { entries?: unknown }).entries)
  ) {
    return (data as { entries: JournalEntryApi[] }).entries;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "journalEntries" in data &&
    Array.isArray((data as { journalEntries?: unknown }).journalEntries)
  ) {
    return (data as { journalEntries: JournalEntryApi[] }).journalEntries;
  }

  return [];
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new Error("The server returned a webpage instead of JSON data.");
  }

  return response.json();
}

function getPlantSpecies(
  plant?: UserPlant | PopulatedJournalPlant | null,
): PlantSpecies | null {
  if (
    !plant ||
    !plant.speciesId ||
    typeof plant.speciesId === "string"
  ) {
    return null;
  }

  return plant.speciesId;
}

function getUserPlantId(
  userPlant: PopulatedJournalPlant | string,
): string {
  return typeof userPlant === "string" ? userPlant : userPlant._id;
}

function getEntryPlant(
  entry: JournalEntryApi,
  plantsById: Map<string, UserPlant>,
): UserPlant | PopulatedJournalPlant | null {
  if (typeof entry.userPlantId === "object") {
    return entry.userPlantId;
  }

  return plantsById.get(entry.userPlantId) ?? null;
}

function isoDateToInputDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return todayInputValue();
  }

  const timezoneOffset = parsedDate.getTimezoneOffset() * 60_000;

  return new Date(parsedDate.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function toJournalEntry(
  entry: JournalEntryApi,
  plantsById: Map<string, UserPlant>,
): JournalEntry {
  const plant = getEntryPlant(entry, plantsById);
  const species = getPlantSpecies(plant);

  return {
    id: entry._id,
    userPlantId: getUserPlantId(entry.userPlantId),
    date: isoDateToInputDate(entry.entryDate),
    entryDate: entry.entryDate,
    title: entry.title?.trim() || "Untitled entry",
    plantName: plant?.nickname || "Unknown plant",
    species: species?.commonName || "Plant species not recorded",
    healthStatus: entry.healthStatus ?? null,
    notes: entry.body,
    watered: entry.watered,
  };
}

function formatDate(date: string): string {
  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function healthLabel(
  healthStatus: PlantHealthStatus | null,
): string {
  if (!healthStatus) {
    return "Not recorded";
  }

  return (
    healthOptions.find((option) => option.value === healthStatus)?.label ??
    healthStatus
  );
}

function Journal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [apiEntries, setApiEntries] = useState<JournalEntryApi[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDraft>(createEmptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  const requestedPlantId = searchParams.get("plantId");

  const redirectOnUnauthorized = useCallback(
    (response: Response): boolean => {
      if (response.status === 401) {
        navigate("/login", { replace: true });
        return true;
      }

      return false;
    },
    [navigate],
  );

  const loadJournal = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setPageError("");

      const [userResponse, plantsResponse, entriesResponse] =
        await Promise.all([
          fetch("/api/auth/me", {
            credentials: "include",
          }),
          fetch("/api/user-plants", {
            credentials: "include",
          }),
          fetch("/api/journal-entries", {
            credentials: "include",
          }),
        ]);

      if (
        redirectOnUnauthorized(userResponse) ||
        redirectOnUnauthorized(plantsResponse) ||
        redirectOnUnauthorized(entriesResponse)
      ) {
        return;
      }

      if (!userResponse.ok) {
        throw new Error("Your account could not be loaded.");
      }

      if (!plantsResponse.ok) {
        throw new Error("Your plants could not be loaded.");
      }

      if (!entriesResponse.ok) {
        throw new Error("Your journal entries could not be loaded.");
      }

      const [userData, plantsData, entriesData] = await Promise.all([
        readJson(userResponse),
        readJson(plantsResponse),
        readJson(entriesResponse),
      ]);

      setCurrentUser(normalizeCurrentUser(userData));
      setPlants(normalizePlants(plantsData));
      setApiEntries(normalizeJournalEntries(entriesData));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Your journal could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [redirectOnUnauthorized]);

  useEffect(() => {
    void loadJournal();
  }, [loadJournal]);

  useEffect(() => {
    if (
      loading ||
      !requestedPlantId ||
      !plants.some((plant) => plant._id === requestedPlantId)
    ) {
      return;
    }

    setDraft(createEmptyDraft(requestedPlantId));
    setComposerOpen(true);
    setSearchParams({}, { replace: true });
  }, [
    loading,
    plants,
    requestedPlantId,
    setSearchParams,
  ]);

  const plantsById = useMemo(
    () => new Map(plants.map((plant) => [plant._id, plant])),
    [plants],
  );

  const entries = useMemo(
    () =>
      apiEntries
        .map((entry) => toJournalEntry(entry, plantsById))
        .sort(
          (firstEntry, secondEntry) =>
            new Date(secondEntry.entryDate).getTime() -
            new Date(firstEntry.entryDate).getTime(),
        ),
    [apiEntries, plantsById],
  );

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.title,
        entry.plantName,
        entry.species,
        healthLabel(entry.healthStatus),
        entry.notes,
        formatDate(entry.date),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [entries, searchTerm]);

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce<Record<string, JournalEntry[]>>(
      (groups, entry) => {
        groups[entry.date] ??= [];
        groups[entry.date].push(entry);

        return groups;
      },
      {},
    );
  }, [filteredEntries]);

  function openComposer(userPlantId?: string): void {
    const selectedPlantId =
      userPlantId ||
      requestedPlantId ||
      plants[0]?._id ||
      "";

    setMessage("");
    setDraft(createEmptyDraft(selectedPlantId));
    setComposerOpen(true);
  }

  function closeComposer(): void {
    if (!saving) {
      setComposerOpen(false);
      setMessage("");
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!draft.userPlantId) {
      setMessage("Choose a plant.");
      return;
    }

    if (!draft.title.trim() || !draft.notes.trim()) {
      setMessage("Add a title and notes.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const entryDate = new Date(
        `${draft.date}T12:00:00`,
      ).toISOString();

      const response = await fetch("/api/journal-entries", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPlantId: draft.userPlantId,
          title: draft.title.trim(),
          body: draft.notes.trim(),
          healthStatus: draft.healthStatus,
          watered: draft.watered,
          entryDate,
          photos: [],
        }),
      });

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error("The journal entry could not be saved.");
      }

      const responseData = await readJson(response);

      if (
        typeof responseData === "object" &&
        responseData !== null &&
        "entry" in responseData
      ) {
        setApiEntries((currentEntries) => [
          (responseData as { entry: JournalEntryApi }).entry,
          ...currentEntries,
        ]);
      } else {
        await loadJournal();
      }

      setComposerOpen(false);
      setDraft(createEmptyDraft(plants[0]?._id ?? ""));
      setMessage("Journal entry saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The journal entry could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const groupedEntryList = Object.entries(groupedEntries);
  const emptyHeading = searchTerm
    ? "No entries found"
    : "No journal entries yet";
  const emptyMessage = searchTerm
    ? "Try searching for something else."
    : "Add your first entry to begin your plant journal.";

  return (
    <div className="journal-page">
      <header className="journal-header">
        <button
          className="journal-header__button"
          type="button"
          aria-label="Back to garden"
          onClick={() => navigate("/garden")}
        >
          ←
        </button>

        <div className="journal-header__title">
          <span aria-hidden="true">📖</span>
          <span>Journal</span>
        </div>

        <button
          className="journal-header__button"
          type="button"
          aria-label="Open garden"
          onClick={() => navigate("/garden")}
        >
          🪴
        </button>
      </header>

      <main className="journal-main">
        <section className="journal-intro">
          <p className="journal-eyebrow">Plant memories</p>
          <h1>
            {currentUser
              ? `${currentUser.username}'s garden journal`
              : "Your garden journal"}
          </h1>
          <p>
            Track growth, care, health changes, and the tiny victories that are
            easy to forget.
          </p>
        </section>

        {message && (
          <p className="journal-database-message" role="status">
            {message}
          </p>
        )}

        {pageError && (
          <p className="journal-database-message journal-database-message--error">
            {pageError}
          </p>
        )}

        <label className="journal-search">
          <span aria-hidden="true">⌕</span>
          <span className="journal-visually-hidden">
            Search journal entries
          </span>
          <input
            type="search"
            value={searchTerm}
            placeholder="Search entries..."
            disabled={loading}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <button
          className="journal-add-card"
          type="button"
          disabled={loading || plants.length === 0}
          onClick={() => openComposer()}
        >
          <span>
            <small>New memory</small>
            <strong>
              {plants.length > 0
                ? "Add journal entry"
                : "Add a plant before journaling"}
            </strong>
          </span>

          <span className="journal-add-card__icon" aria-hidden="true">
            +
          </span>
        </button>

        <section className="journal-notebook" aria-label="Journal entries">
          <div className="journal-notebook__spine" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className="journal-entry-list">
            {loading ? (
              <div className="journal-empty-state" aria-live="polite">
                <span aria-hidden="true">🌱</span>
                <h2>Loading your journal…</h2>
                <p>Gathering your plant memories.</p>
              </div>
            ) : groupedEntryList.length > 0 ? (
              groupedEntryList.map(([date, dateEntries]) => (
                <section className="journal-date-group" key={date}>
                  <h2>{formatDate(date)}</h2>

                  <div className="journal-date-group__entries">
                    {dateEntries.map((entry) => (
                      <article className="journal-entry-card" key={entry.id}>
                        <div className="journal-entry-card__top">
                          <div>
                            <button
                              className="journal-entry-card__plant-link"
                              type="button"
                              onClick={() =>
                                navigate(`/plants/${entry.userPlantId}`)
                              }
                            >
                              {entry.plantName}
                            </button>

                            <h3>{entry.title}</h3>
                          </div>

                          <span
                            className={`journal-health journal-health--${
                              entry.healthStatus ?? "not-recorded"
                            }`}
                          >
                            {healthLabel(entry.healthStatus)}
                          </span>
                        </div>

                        <p className="journal-entry-card__species">
                          {entry.species}
                        </p>

                        <p className="journal-entry-card__notes">
                          {entry.notes}
                        </p>

                        <div className="journal-entry-card__footer">
                          <span>
                            {entry.watered
                              ? "💧 Watered"
                              : "🌱 Observation"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/plants/${entry.userPlantId}`)
                            }
                          >
                            View plant →
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="journal-empty-state">
                <span aria-hidden="true">🌿</span>
                <h2>{emptyHeading}</h2>
                <p>{emptyMessage}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {composerOpen && (
        <div
          className="journal-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeComposer();
            }
          }}
        >
          <section
            className="journal-composer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-composer-title"
          >
            <div className="journal-composer__header">
              <div>
                <p className="journal-eyebrow">New memory</p>
                <h2 id="journal-composer-title">Add journal entry</h2>
              </div>

              <button
                type="button"
                aria-label="Close journal entry form"
                onClick={closeComposer}
              >
                ×
              </button>
            </div>

            {message && (
              <p className="journal-database-message" role="status">
                {message}
              </p>
            )}

            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="journal-form-row">
                <label>
                  Plant
                  <select
                    value={draft.userPlantId}
                    required
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        userPlantId: event.target.value,
                      }))
                    }
                  >
                    {plants.map((plant) => {
                      const species = getPlantSpecies(plant);

                      return (
                        <option value={plant._id} key={plant._id}>
                          {plant.nickname}
                          {species?.commonName
                            ? ` — ${species.commonName}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    required
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Entry title
                <input
                  type="text"
                  value={draft.title}
                  placeholder="What happened today?"
                  required
                  maxLength={150}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Plant health
                <select
                  value={draft.healthStatus}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      healthStatus: event.target.value as PlantHealthStatus,
                    }))
                  }
                >
                  {healthOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Notes
                <textarea
                  value={draft.notes}
                  placeholder="Record growth, care, changes, or anything you noticed..."
                  required
                  rows={6}
                  maxLength={10000}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="journal-checkbox">
                <input
                  type="checkbox"
                  checked={draft.watered}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      watered: event.target.checked,
                    }))
                  }
                />

                <span>I watered this plant today</span>
              </label>

              <div className="journal-composer__actions">
                <button
                  className="journal-secondary-button"
                  type="button"
                  disabled={saving}
                  onClick={closeComposer}
                >
                  Cancel
                </button>

                <button
                  className="journal-primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save entry"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Journal;
