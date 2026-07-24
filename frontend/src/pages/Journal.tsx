import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Journal.css";

type PlantHealth = "Healthy" | "Needs attention" | "Recovering";

type JournalEntry = {
  id: string;
  date: string;
  title: string;
  plantName: string;
  species: string;
  health: PlantHealth;
  notes: string;
  watered: boolean;
};

type JournalDraft = {
  date: string;
  title: string;
  plantName: string;
  health: PlantHealth;
  notes: string;
  watered: boolean;
};


const emptyDraft: JournalDraft = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  plantName: "Monty",
  health: "Healthy",
  notes: "",
  watered: false,
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function Journal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDraft>(emptyDraft);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return entries;

    return entries.filter((entry) =>
      [
        entry.title,
        entry.plantName,
        entry.species,
        entry.health,
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

  function openComposer(): void {
    setDraft({
      ...emptyDraft,
      date: new Date().toISOString().slice(0, 10),
    });
    setComposerOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const plantSpecies: Record<string, string> = {
      Monty: "Monstera",
      Lily: "Peace Lily",
      Snakey: "Snake Plant",
    };

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      date: draft.date,
      title: draft.title.trim(),
      plantName: draft.plantName,
      species: plantSpecies[draft.plantName] ?? "Houseplant",
      health: draft.health,
      notes: draft.notes.trim(),
      watered: draft.watered,
    };

    setEntries((currentEntries) =>
      [newEntry, ...currentEntries].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    );
    setComposerOpen(false);
  }

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
          <h1>Your garden journal</h1>
          <p>
            Track growth, care, health changes, and the tiny victories that are
            easy to forget.
          </p>
        </section>

        <label className="journal-search">
          <span aria-hidden="true">⌕</span>
          <span className="journal-visually-hidden">Search journal entries</span>
          <input
            type="search"
            value={searchTerm}
            placeholder="Search entries..."
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <button
          className="journal-add-card"
          type="button"
          onClick={openComposer}
        >
          <span>
            <small>New memory</small>
            <strong>Add journal entry</strong>
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
            {Object.entries(groupedEntries).length > 0 ? (
              Object.entries(groupedEntries).map(([date, dateEntries]) => (
                <section className="journal-date-group" key={date}>
                  <h2>{formatDate(date)}</h2>

                  <div className="journal-date-group__entries">
                    {dateEntries.map((entry) => (
                      <article className="journal-entry-card" key={entry.id}>
                        <div className="journal-entry-card__top">
                          <div>
                            <p>{entry.plantName}</p>
                            <h3>{entry.title}</h3>
                          </div>

                          <span
                            className={`journal-health journal-health--${entry.health
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {entry.health}
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
                            {entry.watered ? "💧 Watered" : "🌱 Observation"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              console.log(`Open journal entry ${entry.id}`)
                            }
                          >
                            Read entry →
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
                <h2>No entries found</h2>
                <p>Try another search or add a new journal entry.</p>
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
            if (event.target === event.currentTarget) setComposerOpen(false);
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
                onClick={() => setComposerOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="journal-form-row">
                <label>
                  Plant
                  <select
                    value={draft.plantName}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        plantName: event.target.value,
                      }))
                    }
                  >
                    <option>Monty</option>
                    <option>Lily</option>
                    <option>Snakey</option>
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
                  maxLength={80}
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
                  value={draft.health}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      health: event.target.value as PlantHealth,
                    }))
                  }
                >
                  <option>Healthy</option>
                  <option>Needs attention</option>
                  <option>Recovering</option>
                </select>
              </label>

              <label>
                Notes
                <textarea
                  value={draft.notes}
                  placeholder="Record growth, care, changes, or anything you noticed..."
                  required
                  rows={6}
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
                  onClick={() => setComposerOpen(false)}
                >
                  Cancel
                </button>
                <button className="journal-primary-button" type="submit">
                  Save entry
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
