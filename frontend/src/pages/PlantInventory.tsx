import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PlantInventory.css";

type PlantPicture = {
  fileId?: string;
  url?: string;
};

type InventoryPlant = {
  _id: string;
  nickname: string;
  speciesId?: {
    _id?: string;
    commonName?: string;
    scientificName?: string;
  } | null;
  species?: {
    _id?: string;
    commonName?: string;
    scientificName?: string;
  } | null;
  healthStatus?: string | null;
  healthScore?: number | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  picture?: PlantPicture | null;
};

const previewPlants: InventoryPlant[] = [
  {
    _id: "1",
    nickname: "Snakey",
    speciesId: {
      commonName: "Snake Plant",
      scientificName: "Dracaena trifasciata",
    },
    healthStatus: "Healthy",
    healthScore: 92,
    lastWateredAt: "2026-07-21T12:00:00.000Z",
    nextWateringAt: "2026-07-28T12:00:00.000Z",
  },
  {
    _id: "2",
    nickname: "Monty",
    speciesId: {
      commonName: "Monstera",
      scientificName: "Monstera deliciosa",
    },
    healthStatus: "Healthy",
    healthScore: 88,
    lastWateredAt: "2026-07-24T12:00:00.000Z",
    nextWateringAt: "2026-07-31T12:00:00.000Z",
  },
  {
    _id: "3",
    nickname: "Lily",
    speciesId: {
      commonName: "Peace Lily",
      scientificName: "Spathiphyllum",
    },
    healthStatus: "Needs attention",
    healthScore: 64,
    lastWateredAt: "2026-07-20T12:00:00.000Z",
    nextWateringAt: "2026-07-23T12:00:00.000Z",
  },
];

function normalizePlantsResponse(data: unknown): InventoryPlant[] {
  if (Array.isArray(data)) {
    return data as InventoryPlant[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "plants" in data &&
    Array.isArray((data as { plants?: unknown }).plants)
  ) {
    return (data as { plants: InventoryPlant[] }).plants;
  }

  return [];
}

function getSpecies(plant: InventoryPlant): InventoryPlant["speciesId"] {
  return plant.speciesId ?? plant.species ?? null;
}

function getPictureSource(picture?: PlantPicture | null): string | null {
  if (picture?.url) {
    return picture.url;
  }

  if (picture?.fileId) {
    return `/api/photos/${picture.fileId}`;
  }

  return null;
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

function needsAttention(plant: InventoryPlant): boolean {
  const healthNeedsAttention =
    Boolean(plant.healthStatus) && plant.healthStatus !== "Healthy";

  const nextWateringTime = plant.nextWateringAt
    ? new Date(plant.nextWateringAt).getTime()
    : Number.POSITIVE_INFINITY;

  const wateringOverdue =
    Number.isFinite(nextWateringTime) && nextWateringTime < Date.now();

  return healthNeedsAttention || wateringOverdue;
}

function PlantInventory() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plants, setPlants] = useState<InventoryPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlants(): Promise<void> {
      try {
        setLoading(true);
        setPageError("");

        const response = await fetch("/api/user-plants", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Your plant inventory could not be loaded.");
        }

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error(
            "The plant API returned a webpage instead of plant data.",
          );
        }

        const data: unknown = await response.json();
        setPlants(normalizePlantsResponse(data));
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        if (import.meta.env.DEV) {
          setPlants(previewPlants);
          setPageError("");
          return;
        }

        setPageError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while loading your plants.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPlants();

    return () => controller.abort();
  }, []);

  const notificationCount = useMemo(
    () => plants.filter(needsAttention).length,
    [plants],
  );

  return (
    <div className="inventory-page">
      {menuOpen && (
        <button
          className="inventory-menu-overlay"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`inventory-side-menu ${
          menuOpen ? "inventory-side-menu--open" : ""
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="inventory-side-menu__header">
          <div>
            <span aria-hidden="true">🌱</span>
            <strong>Pot Buddy</strong>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav>
          <button type="button" onClick={() => navigate("/garden")}>
            <span aria-hidden="true">🏠</span>
            Dashboard
          </button>

          <button
            className="inventory-side-menu__active"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate("/plants");
            }}
          >
            <span aria-hidden="true">🪴</span>
            Plant inventory
          </button>

          <button type="button" onClick={() => navigate("/journal")}>
            <span aria-hidden="true">📖</span>
            Journal
          </button>

          <button type="button" onClick={() => navigate("/profile")}>
            <span aria-hidden="true">👤</span>
            Profile
          </button>
        </nav>
      </aside>

      <header className="inventory-header">
        <button
          className="inventory-header__button"
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>

        <div className="inventory-header__title">
          <span aria-hidden="true">🪴</span>
          <span>Inventory</span>
        </div>

        <button
          className="inventory-header__button inventory-notification-button"
          type="button"
          aria-label="Open notifications"
          onClick={() => console.log("Open notifications")}
        >
          🔔
          {notificationCount > 0 && (
            <span
              className="inventory-notification-badge"
              aria-label={`${notificationCount} notifications`}
            >
              {notificationCount}
            </span>
          )}
        </button>
      </header>

      <main className="inventory-main">
        <section className="inventory-intro">
          <div>
            <p className="inventory-eyebrow">Your collection</p>
            <h1>Plant inventory</h1>
            <p>
              See every plant in your garden and open one to view its photos,
              care history, and details.
            </p>
          </div>

          <button type="button" onClick={() => navigate("/plants/add")}>
            <span aria-hidden="true">＋</span>
            Add plant
          </button>
        </section>

        {loading ? (
          <section className="inventory-state" aria-live="polite">
            <span aria-hidden="true">🌱</span>
            <h2>Loading your plants…</h2>
            <p>Gathering your collection.</p>
          </section>
        ) : pageError ? (
          <section className="inventory-state">
            <span aria-hidden="true">🪴</span>
            <h2>Inventory unavailable</h2>
            <p>{pageError}</p>
          </section>
        ) : plants.length === 0 ? (
          <section className="inventory-state">
            <span aria-hidden="true">🌿</span>
            <h2>No plants yet</h2>
            <p>Add your first plant to begin building your garden.</p>
            <button type="button" onClick={() => navigate("/plants/add")}>
              Add a plant
            </button>
          </section>
        ) : (
          <section className="inventory-list" aria-label="Your plants">
            {plants.map((plant) => {
              const species = getSpecies(plant);
              const pictureSource = getPictureSource(plant.picture);
              const attentionNeeded = needsAttention(plant);

              return (
                <button
                  className="inventory-card"
                  type="button"
                  key={plant._id}
                  onClick={() => navigate(`/plants/${plant._id}`)}
                  aria-label={`Open ${plant.nickname}`}
                >
                  <span className="inventory-card__image">
                    {pictureSource ? (
                      <img
                        src={pictureSource}
                        alt={`${plant.nickname} plant`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.removeAttribute(
                            "hidden",
                          );
                        }}
                      />
                    ) : null}

                    <span hidden={Boolean(pictureSource)} aria-hidden="true">
                      🪴
                    </span>
                  </span>

                  <span className="inventory-card__details">
                    <strong>{plant.nickname}</strong>
                    <span>
                      {species?.commonName || "Plant species not recorded"}
                    </span>
                    <small>
                      Last watered: {formatDate(plant.lastWateredAt)}
                    </small>
                  </span>

                  <span
                    className={`inventory-card__status ${
                      attentionNeeded
                        ? "inventory-card__status--attention"
                        : "inventory-card__status--healthy"
                    }`}
                  >
                    <span aria-hidden="true" />
                    <span>
                      {plant.healthStatus ||
                        (attentionNeeded ? "Needs attention" : "Healthy")}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default PlantInventory;
