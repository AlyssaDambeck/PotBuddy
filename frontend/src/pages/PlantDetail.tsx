import {
  ChangeEvent,
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
};

type CareEvent = {
  _id: string;
  type: "watered" | "photo" | "journal" | "health" | "added" | "other";
  title: string;
  details?: string;
  occurredAt: string;
};

type PlantDetailData = {
  _id: string;
  nickname: string;
  species?: {
    commonName?: string;
    scientificName?: string;
  } | null;
  speciesId?: {
    _id?: string;
    commonName?: string;
    scientificName?: string;
  } | null;
  healthStatus?: string | null;
  healthScore?: number | null;
  notes?: string | null;
  location?: string | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  picture?: PlantPhoto | null;
  photos?: PlantPhoto[];
  careTimeline?: CareEvent[];
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
    careTimeline: [],
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
    careTimeline: [],
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
    careTimeline: [],
  },
};

function getPhotoSource(photo?: PlantPhoto | null): string | null {
  if (photo?.url) return photo.url;
  if (photo?.fileId) return `/api/photos/${photo.fileId}`;
  return null;
}

function formatDate(date?: string | null): string {
  if (!date) return "Not recorded";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatTimelineDate(date: string): string {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function getTimelineIcon(type: CareEvent["type"]): string {
  const icons: Record<CareEvent["type"], string> = {
    watered: "💧",
    photo: "📷",
    journal: "📖",
    health: "🌿",
    added: "🪴",
    other: "•",
  };

  return icons[type];
}

function normalizePlantResponse(data: unknown): PlantDetailData {
  if (typeof data === "object" && data !== null && "plant" in data) {
    return (data as { plant: PlantDetailData }).plant;
  }

  return data as PlantDetailData;
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

  const loadPlant = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!plantId) {
        setPageError("No plant was selected.");
        setLoading(false);
        return;
      }

      const previewPlant = previewPlants[plantId];

      if (previewPlant) {
        setPlant({
          ...previewPlant,
          species: previewPlant.species
            ? { ...previewPlant.species }
            : previewPlant.species,
          careTimeline: [...(previewPlant.careTimeline ?? [])],
        });
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
    return getPhotoSource(plant?.picture) ?? getPhotoSource(plant?.photos?.[0]);
  }, [plant]);

  const careTimeline = useMemo(() => {
    return [...(plant?.careTimeline ?? [])].sort(
      (firstEvent, secondEvent) =>
        new Date(secondEvent.occurredAt).getTime() -
        new Date(firstEvent.occurredAt).getTime(),
    );
  }, [plant?.careTimeline]);

  async function handleWaterPlant(): Promise<void> {
    if (!plantId || watering) return;

    try {
      setWatering(true);
      setActionMessage("");

      if (previewPlants[plantId]) {
        const wateredAt = new Date();
        const nextWateringAt = new Date(wateredAt);
        nextWateringAt.setDate(nextWateringAt.getDate() + 7);

        setPlant((currentPlant) =>
          currentPlant
            ? {
                ...currentPlant,
                lastWateredAt: wateredAt.toISOString(),
                nextWateringAt: nextWateringAt.toISOString(),
                careTimeline: [
                  {
                    _id: `preview-water-${Date.now()}`,
                    type: "watered",
                    title: "Plant watered",
                    details: "Watering was recorded in the frontend preview.",
                    occurredAt: wateredAt.toISOString(),
                  },
                  ...(currentPlant.careTimeline ?? []),
                ],
              }
            : currentPlant,
        );
        setActionMessage(
          "Watering recorded for this preview. It will reset after refresh.",
        );
        return;
      }

      const response = await fetch(`/api/user-plants/${plantId}/water`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wateredAt: new Date().toISOString() }),
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

  async function handlePhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !plantId) return;

    if (!selectedFile.type.startsWith("image/")) {
      setActionMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setActionMessage("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);
      setActionMessage("");

      if (previewPlants[plantId]) {
        const previewUrl = URL.createObjectURL(selectedFile);
        const uploadedAt = new Date().toISOString();

        setPlant((currentPlant) =>
          currentPlant
            ? {
                ...currentPlant,
                picture: { url: previewUrl },
                careTimeline: [
                  {
                    _id: `preview-photo-${Date.now()}`,
                    type: "photo",
                    title: "Photo added",
                    details: selectedFile.name,
                    occurredAt: uploadedAt,
                  },
                  ...(currentPlant.careTimeline ?? []),
                ],
              }
            : currentPlant,
        );
        setActionMessage(
          "Photo added to this preview. It will reset after refresh.",
        );
        return;
      }

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

  async function handleDeletePlant(): Promise<void> {
    if (!plantId || !plant || deleting) return;

    const confirmed = window.confirm(
      `Delete ${plant.nickname}? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setDeleting(true);

      if (previewPlants[plantId]) {
        navigate("/garden");
        return;
      }

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
          <span aria-hidden="true">🌱</span>
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
          <span aria-hidden="true">🪴</span>
          <h1>Plant unavailable</h1>
          <p>{pageError || "This plant could not be loaded."}</p>
          <button type="button" onClick={() => navigate("/garden")}>
            Back to garden
          </button>
        </main>
      </div>
    );
  }

  const species = plant.speciesId ?? plant.species;

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
              <img src={featuredPhoto} alt={`${plant.nickname} plant`} />
            ) : (
              <div className="plant-detail-photo-card__empty">
                <span aria-hidden="true">🪴</span>
                <strong>No plant photo yet</strong>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                >
                  Add the first photo
                </button>
              </div>
            )}
          </div>

          <div className="plant-detail-summary">
            <div className="plant-detail-title">
              <p className="plant-detail-eyebrow">
                {species?.commonName || "Your plant"}
              </p>
              <h1>{plant.nickname}</h1>
              {species?.scientificName && (
                <p className="plant-detail-scientific-name">
                  {species.scientificName}
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
          </div>
        </section>

        <section className="plant-detail-actions" aria-label="Plant actions">
          <button
            type="button"
            onClick={() => void handleWaterPlant()}
            disabled={watering}
          >
            <span aria-hidden="true">💧</span>
            <span>{watering ? "Saving…" : "Water plant"}</span>
          </button>

          <button type="button" onClick={handleJournalEntry}>
            <span aria-hidden="true">📖</span>
            <span>Journal entry</span>
          </button>

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
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
                  <span className="plant-detail-timeline__icon" aria-hidden="true">
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

        {plant.notes && (
          <section className="plant-detail-notes">
            <p className="plant-detail-eyebrow">Notes</p>
            <h2>About {plant.nickname}</h2>
            <p>{plant.notes}</p>
          </section>
        )}

        <section className="plant-detail-management">
          <button
            type="button"
            onClick={() => navigate(`/plants/${plantId}/edit`)}
          >
            Edit plant
          </button>

          <button
            className="plant-detail-delete-button"
            type="button"
            onClick={() => void handleDeletePlant()}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete plant"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default PlantDetail;
