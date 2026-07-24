import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PlantDetail.css";

type PlantPhoto = {
  fileId?: string;
  url?: string;
  alt?: string;
};

type CareEventType =
  | "watered"
  | "photo"
  | "journal"
  | "health"
  | "added"
  | "edited"
  | "other";

type CareEvent = {
  _id: string;
  type: CareEventType;
  title: string;
  details?: string;
  occurredAt: string;
};

type PlantDetailData = {
  _id: string;
  nickname: string;
  species?: {
    _id?: string;
    commonName?: string;
    scientificName?: string;
  } | null;
  healthStatus?: string | null;
  healthScore?: number | null;
  notes?: string | null;
  location?: string | null;
  acquiredAt?: string | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  picture?: PlantPhoto | null;
  photos?: PlantPhoto[];
  careTimeline?: CareEvent[];
};

type PlantEditDraft = {
  nickname: string;
  healthStatus: string;
  healthScore: string;
  location: string;
  lastWateredAt: string;
  nextWateringAt: string;
  notes: string;
};

const previewPlants: Record<string, PlantDetailData> = {
  "1": {
    _id: "1",
    nickname: "Snakey",
    species: {
      commonName: "Snake Plant",
      scientificName: "Dracaena trifasciata",
    },
    healthStatus: "Healthy",
    healthScore: 92,
    lastWateredAt: "2026-07-21T12:00:00.000Z",
    nextWateringAt: "2026-07-28T12:00:00.000Z",
    location: "Bedroom window",
    notes: "Prefers bright, indirect light and infrequent watering.",
    careTimeline: [
      {
        _id: "snakey-added",
        type: "added",
        title: "Added to the garden",
        details: "Snakey joined your PotBuddy collection.",
        occurredAt: "2026-07-10T15:30:00.000Z",
      },
    ],
  },
  "2": {
    _id: "2",
    nickname: "Monty",
    species: {
      commonName: "Monstera",
      scientificName: "Monstera deliciosa",
    },
    healthStatus: "Healthy",
    healthScore: 88,
    lastWateredAt: "2026-07-24T12:00:00.000Z",
    nextWateringAt: "2026-07-31T12:00:00.000Z",
    location: "Living room",
    notes: "Rotate the pot regularly so growth stays even.",
    careTimeline: [
      {
        _id: "monty-watered",
        type: "watered",
        title: "Plant watered",
        details: "Watering was recorded for Monty.",
        occurredAt: "2026-07-24T12:00:00.000Z",
      },
      {
        _id: "monty-added",
        type: "added",
        title: "Added to the garden",
        details: "Monty joined your PotBuddy collection.",
        occurredAt: "2026-07-05T16:00:00.000Z",
      },
    ],
  },
  "3": {
    _id: "3",
    nickname: "Lily",
    species: {
      commonName: "Peace Lily",
      scientificName: "Spathiphyllum",
    },
    healthStatus: "Needs attention",
    healthScore: 64,
    lastWateredAt: "2026-07-20T12:00:00.000Z",
    nextWateringAt: "2026-07-23T12:00:00.000Z",
    location: "Kitchen",
    notes: "Check soil moisture and keep away from direct sunlight.",
    careTimeline: [
      {
        _id: "lily-health",
        type: "health",
        title: "Health needs attention",
        details: "Some leaves appear droopy.",
        occurredAt: "2026-07-23T10:15:00.000Z",
      },
    ],
  },
};

function getPhotoSource(photo?: PlantPhoto | null): string | null {
  if (photo?.url) {
    return photo.url;
  }

  if (photo?.fileId) {
    return `/api/photos/${photo.fileId}`;
  }

  return null;
}

function toDateInputValue(date?: string | null): string {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function dateInputToIso(date: string): string | null {
  return date ? new Date(`${date}T12:00:00`).toISOString() : null;
}

function formatDate(date?: string | null): string {
  if (!date) {
    return "Not recorded";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatTimelineDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function getTimelineIcon(type: CareEventType): string {
  const icons: Record<CareEventType, string> = {
    watered: "💧",
    photo: "📷",
    journal: "📖",
    health: "🌿",
    added: "🪴",
    edited: "✏️",
    other: "•",
  };

  return icons[type];
}

function normalizePlantResponse(data: unknown): PlantDetailData {
  if (
    typeof data === "object" &&
    data !== null &&
    "plant" in data &&
    typeof (data as { plant?: unknown }).plant === "object"
  ) {
    return (data as { plant: PlantDetailData }).plant;
  }

  return data as PlantDetailData;
}

function createEditDraft(plant: PlantDetailData): PlantEditDraft {
  return {
    nickname: plant.nickname,
    healthStatus: plant.healthStatus ?? "",
    healthScore:
      typeof plant.healthScore === "number" ? String(plant.healthScore) : "",
    location: plant.location ?? "",
    lastWateredAt: toDateInputValue(plant.lastWateredAt),
    nextWateringAt: toDateInputValue(plant.nextWateringAt),
    notes: plant.notes ?? "",
  };
}

function PlantDetail() {
  const navigate = useNavigate();
  const { plantId } = useParams<{ plantId: string }>();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [plant, setPlant] = useState<PlantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [watering, setWatering] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<PlantEditDraft | null>(null);

  const isPreviewPlant = Boolean(plantId && previewPlants[plantId]);

  const loadPlant = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!plantId) {
        setPageError("No plant was selected.");
        setLoading(false);
        return;
      }

      const previewPlant = previewPlants[plantId];

      if (previewPlant) {
        setPlant(previewPlant);
        setPageError("");
        setLoading(false);
        return;
      }

      try {
        setPageError("");

        const response = await fetch(`/api/user-plants/${plantId}`, {
          credentials: "include",
          signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This plant could not be found."
              : "The plant details could not be loaded.",
          );
        }

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error(
            "The plant API returned a webpage instead of plant data.",
          );
        }

        const data: unknown = await response.json();
        setPlant(normalizePlantResponse(data));
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setPageError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while loading this plant.",
        );
      } finally {
        setLoading(false);
      }
    },
    [plantId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPlant(controller.signal);

    return () => controller.abort();
  }, [loadPlant]);

  const featuredPhoto = useMemo(() => {
    const primaryPhoto = getPhotoSource(plant?.picture);

    if (primaryPhoto) {
      return primaryPhoto;
    }

    return getPhotoSource(plant?.photos?.[0]);
  }, [plant]);

  const careTimeline = useMemo(() => {
    return [...(plant?.careTimeline ?? [])].sort(
      (firstEvent, secondEvent) =>
        new Date(secondEvent.occurredAt).getTime() -
        new Date(firstEvent.occurredAt).getTime(),
    );
  }, [plant?.careTimeline]);

  async function handleWaterPlant(): Promise<void> {
    if (!plantId || !plant || watering) {
      return;
    }

    const wateredAt = new Date().toISOString();

    if (isPreviewPlant) {
      const updatedPlant: PlantDetailData = {
        ...plant,
        lastWateredAt: wateredAt,
        careTimeline: [
          {
            _id: `preview-watered-${Date.now()}`,
            type: "watered",
            title: "Plant watered",
            details: `Watering was recorded for ${plant.nickname}.`,
            occurredAt: wateredAt,
          },
          ...(plant.careTimeline ?? []),
        ],
      };

      previewPlants[plantId] = updatedPlant;
      setPlant(updatedPlant);
      setActionMessage("Watering recorded for this preview.");
      return;
    }

    try {
      setWatering(true);
      setActionMessage("");

      const response = await fetch(`/api/user-plants/${plantId}/water`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wateredAt }),
      });

      if (!response.ok) {
        throw new Error("The watering update could not be saved.");
      }

      await loadPlant();
      setActionMessage("Watering recorded.");
    } catch (requestError) {
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "The watering update could not be saved.",
      );
    } finally {
      setWatering(false);
    }
  }

  function handleJournalEntry(): void {
    if (plantId) {
      navigate(`/journal?plantId=${encodeURIComponent(plantId)}`);
    }
  }

  function openPhotoPicker(): void {
    photoInputRef.current?.click();
  }

  async function handlePhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile || !plantId || !plant) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setActionMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (selectedFile.size > maximumFileSize) {
      setActionMessage("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    if (isPreviewPlant) {
      const localPhotoUrl = URL.createObjectURL(selectedFile);
      const newPhoto: PlantPhoto = {
        url: localPhotoUrl,
        alt: `${plant.nickname} plant`,
      };

      const updatedPlant: PlantDetailData = {
        ...plant,
        picture: newPhoto,
        photos: [newPhoto, ...(plant.photos ?? [])],
        careTimeline: [
          {
            _id: `preview-photo-${Date.now()}`,
            type: "photo",
            title: "Photo added",
            details: `${selectedFile.name} was added to this preview plant.`,
            occurredAt: new Date().toISOString(),
          },
          ...(plant.careTimeline ?? []),
        ],
      };

      previewPlants[plantId] = updatedPlant;
      setPlant(updatedPlant);
      setActionMessage("Photo added for this preview.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);
      setActionMessage("");

      const formData = new FormData();
      formData.append("photo", selectedFile);

      const response = await fetch(`/api/user-plants/${plantId}/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("The photo could not be uploaded.");
      }

      await loadPlant();
      setActionMessage("Photo added.");
    } catch (requestError) {
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "The photo could not be uploaded.",
      );
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  }

  function startEditing(): void {
    if (!plant) {
      return;
    }

    setEditDraft(createEditDraft(plant));
    setActionMessage("");
    setEditing(true);
  }

  function cancelEditing(): void {
    setEditDraft(null);
    setEditing(false);
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!plantId || !plant || !editDraft || savingEdit) {
      return;
    }

    const trimmedNickname = editDraft.nickname.trim();

    if (!trimmedNickname) {
      setActionMessage("Plant name is required.");
      return;
    }

    const parsedHealthScore =
      editDraft.healthScore === ""
        ? null
        : Number(editDraft.healthScore);

    if (
      parsedHealthScore !== null &&
      (!Number.isFinite(parsedHealthScore) ||
        parsedHealthScore < 0 ||
        parsedHealthScore > 100)
    ) {
      setActionMessage("Health percentage must be between 0 and 100.");
      return;
    }

    const updatePayload = {
      nickname: trimmedNickname,
      healthStatus: editDraft.healthStatus.trim() || null,
      healthScore: parsedHealthScore,
      location: editDraft.location.trim() || null,
      lastWateredAt: dateInputToIso(editDraft.lastWateredAt),
      nextWateringAt: dateInputToIso(editDraft.nextWateringAt),
      notes: editDraft.notes.trim() || null,
    };

    if (isPreviewPlant) {
      const updatedPlant: PlantDetailData = {
        ...plant,
        ...updatePayload,
        careTimeline: [
          {
            _id: `preview-edited-${Date.now()}`,
            type: "edited",
            title: "Plant details updated",
            details: `Details for ${trimmedNickname} were edited.`,
            occurredAt: new Date().toISOString(),
          },
          ...(plant.careTimeline ?? []),
        ],
      };

      previewPlants[plantId] = updatedPlant;
      setPlant(updatedPlant);
      setEditing(false);
      setEditDraft(null);
      setActionMessage("Plant details updated for this preview.");
      return;
    }

    try {
      setSavingEdit(true);
      setActionMessage("");

      const response = await fetch(`/api/user-plants/${plantId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("The plant changes could not be saved.");
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data: unknown = await response.json();
        setPlant(normalizePlantResponse(data));
      } else {
        await loadPlant();
      }

      setEditing(false);
      setEditDraft(null);
      setActionMessage("Plant details updated.");
    } catch (requestError) {
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "The plant changes could not be saved.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePlant(): Promise<void> {
    if (!plantId || !plant || deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${plant.nickname}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    if (isPreviewPlant) {
      navigate("/garden");
      return;
    }

    try {
      setDeleting(true);
      setActionMessage("");

      const response = await fetch(`/api/user-plants/${plantId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("The plant could not be deleted.");
      }

      navigate("/garden");
    } catch (requestError) {
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "The plant could not be deleted.",
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="plant-detail-page">
        <main className="plant-detail-state" aria-live="polite">
          <span className="plant-detail-state__icon" aria-hidden="true">
            🌱
          </span>
          <h1>Loading plant…</h1>
          <p>Gathering care details and recent activity.</p>
        </main>
      </div>
    );
  }

  if (pageError || !plant) {
    return (
      <div className="plant-detail-page">
        <main className="plant-detail-state">
          <span className="plant-detail-state__icon" aria-hidden="true">
            🪴
          </span>
          <h1>Plant unavailable</h1>
          <p>{pageError || "This plant could not be loaded."}</p>
          <button type="button" onClick={() => navigate("/garden")}>
            Back to garden
          </button>
        </main>
      </div>
    );
  }

  const healthText =
    typeof plant.healthScore === "number"
      ? `${Math.round(plant.healthScore)}%`
      : plant.healthStatus || "Not recorded";

  return (
    <div className="plant-detail-page">
      <header className="plant-detail-header">
        <button
          className="plant-detail-header__button"
          type="button"
          aria-label="Back to garden"
          onClick={() => navigate("/garden")}
        >
          ←
        </button>

        <div className="plant-detail-header__brand">
          <span aria-hidden="true">🌱</span>
          <span>Plant details</span>
        </div>

        <button
          className="plant-detail-header__button"
          type="button"
          aria-label="Open profile"
          onClick={() => navigate("/profile")}
        >
          🪴
        </button>
      </header>

      <main className="plant-detail-main">
        <section className="plant-detail-hero">
          <div className="plant-detail-photo-card">
            {featuredPhoto ? (
              <img
                src={featuredPhoto}
                alt={`${plant.nickname} plant`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling?.removeAttribute(
                    "hidden",
                  );
                }}
              />
            ) : null}

            <div
              className="plant-detail-photo-card__empty"
              hidden={Boolean(featuredPhoto)}
            >
              <span aria-hidden="true">🪴</span>
              <strong>No plant photo yet</strong>
              <button type="button" onClick={openPhotoPicker}>
                Add the first photo
              </button>
            </div>
          </div>

          <div className="plant-detail-summary">
            {editing && editDraft ? (
              <form
                className="plant-detail-edit-form"
                onSubmit={(event) => void handleEditSubmit(event)}
              >
                <div className="plant-detail-edit-form__heading">
                  <div>
                    <p className="plant-detail-eyebrow">Editing</p>
                    <h1>Edit plant details</h1>
                  </div>

                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </div>

                <label>
                  Plant name
                  <input
                    type="text"
                    value={editDraft.nickname}
                    maxLength={60}
                    required
                    onChange={(event) =>
                      setEditDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              nickname: event.target.value,
                            }
                          : currentDraft,
                      )
                    }
                  />
                </label>

                <div className="plant-detail-edit-form__row">
                  <label>
                    Health status
                    <select
                      value={editDraft.healthStatus}
                      onChange={(event) =>
                        setEditDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                healthStatus: event.target.value,
                              }
                            : currentDraft,
                        )
                      }
                    >
                      <option value="">Not recorded</option>
                      <option value="Healthy">Healthy</option>
                      <option value="Needs attention">
                        Needs attention
                      </option>
                      <option value="Recovering">Recovering</option>
                    </select>
                  </label>

                  <label>
                    Health percentage
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDraft.healthScore}
                      placeholder="0–100"
                      onChange={(event) =>
                        setEditDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                healthScore: event.target.value,
                              }
                            : currentDraft,
                        )
                      }
                    />
                  </label>
                </div>

                <label>
                  Location
                  <input
                    type="text"
                    value={editDraft.location}
                    maxLength={80}
                    placeholder="Living room, kitchen, bedroom..."
                    onChange={(event) =>
                      setEditDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              location: event.target.value,
                            }
                          : currentDraft,
                      )
                    }
                  />
                </label>

                <div className="plant-detail-edit-form__row">
                  <label>
                    Last watered
                    <input
                      type="date"
                      value={editDraft.lastWateredAt}
                      onChange={(event) =>
                        setEditDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                lastWateredAt: event.target.value,
                              }
                            : currentDraft,
                        )
                      }
                    />
                  </label>

                  <label>
                    Next watering
                    <input
                      type="date"
                      value={editDraft.nextWateringAt}
                      onChange={(event) =>
                        setEditDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                nextWateringAt: event.target.value,
                              }
                            : currentDraft,
                        )
                      }
                    />
                  </label>
                </div>

                <label>
                  Notes
                  <textarea
                    value={editDraft.notes}
                    rows={5}
                    maxLength={1000}
                    placeholder="Add care notes or anything useful to remember..."
                    onChange={(event) =>
                      setEditDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              notes: event.target.value,
                            }
                          : currentDraft,
                      )
                    }
                  />
                </label>

                <button
                  className="plant-detail-edit-form__save"
                  type="submit"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </form>
            ) : (
              <>
                <div className="plant-detail-title">
                  <p className="plant-detail-eyebrow">
                    {plant.species?.commonName || "Your plant"}
                  </p>
                  <h1>{plant.nickname}</h1>
                  {plant.species?.scientificName && (
                    <p className="plant-detail-scientific-name">
                      {plant.species.scientificName}
                    </p>
                  )}
                </div>

                <dl className="plant-detail-facts">
                  <div>
                    <dt>Last watered</dt>
                    <dd>{formatDate(plant.lastWateredAt)}</dd>
                  </div>

                  <div>
                    <dt>Next watering</dt>
                    <dd>{formatDate(plant.nextWateringAt)}</dd>
                  </div>

                  <div>
                    <dt>Health</dt>
                    <dd>{healthText}</dd>
                  </div>

                  {plant.location && (
                    <div>
                      <dt>Location</dt>
                      <dd>{plant.location}</dd>
                    </div>
                  )}
                </dl>
              </>
            )}
          </div>
        </section>

        <section className="plant-detail-actions" aria-label="Plant actions">
          <button
            type="button"
            onClick={() => void handleWaterPlant()}
            disabled={watering || editing}
          >
            <span aria-hidden="true">💧</span>
            <span>{watering ? "Saving…" : "Water plant"}</span>
          </button>

          <button
            type="button"
            onClick={handleJournalEntry}
            disabled={editing}
          >
            <span aria-hidden="true">📖</span>
            <span>Journal entry</span>
          </button>

          <button
            type="button"
            onClick={openPhotoPicker}
            disabled={uploadingPhoto || editing}
          >
            <span aria-hidden="true">📷</span>
            <span>{uploadingPhoto ? "Uploading…" : "Add photo"}</span>
          </button>

          <input
            ref={photoInputRef}
            className="plant-detail-hidden-input"
            type="file"
            accept="image/*"
            onChange={(event) => void handlePhotoSelected(event)}
          />
        </section>

        {actionMessage && (
          <p className="plant-detail-message" role="status">
            {actionMessage}
          </p>
        )}

        <section className="plant-detail-timeline">
          <div className="plant-detail-section-heading">
            <div>
              <p className="plant-detail-eyebrow">History</p>
              <h2>Care timeline</h2>
            </div>

            <span>{careTimeline.length}</span>
          </div>

          {careTimeline.length > 0 ? (
            <ol className="plant-detail-timeline__list">
              {careTimeline.map((event) => (
                <li key={event._id}>
                  <span
                    className="plant-detail-timeline__icon"
                    aria-hidden="true"
                  >
                    {getTimelineIcon(event.type)}
                  </span>

                  <article>
                    <div>
                      <h3>{event.title}</h3>
                      <time dateTime={event.occurredAt}>
                        {formatTimelineDate(event.occurredAt)}
                      </time>
                    </div>

                    {event.details && <p>{event.details}</p>}
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <div className="plant-detail-empty-timeline">
              <span aria-hidden="true">🌿</span>
              <h3>No care activity yet</h3>
              <p>
                Watering, journal entries, health updates, and photos will
                appear here.
              </p>
            </div>
          )}
        </section>

        {plant.notes && !editing && (
          <section className="plant-detail-notes">
            <p className="plant-detail-eyebrow">Notes</p>
            <h2>About {plant.nickname}</h2>
            <p>{plant.notes}</p>
          </section>
        )}

        <section className="plant-detail-management">
          <button
            type="button"
            onClick={editing ? cancelEditing : startEditing}
          >
            {editing ? "Cancel editing" : "Edit plant"}
          </button>

          <button
            className="plant-detail-delete-button"
            type="button"
            onClick={() => void handleDeletePlant()}
            disabled={deleting || editing}
          >
            {deleting ? "Deleting…" : "Delete plant"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default PlantDetail;
