import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import "./PlantInventory.css";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

function getAuthToken(): string | null {
  return localStorage.getItem("potbuddyToken");
}

async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

type PlantHealthStatus =
  | "healthy"
  | "needs-attention"
  | "sick"
  | "recovering"
  | "dormant"
  | "dead";

type LegacyPlantHealthStatus =
  | "Healthy"
  | "Needs attention"
  | "Needs Attention"
  | "Sick"
  | "Recovering"
  | "Dormant"
  | "Dead";

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

type PlantPicture = {
  fileId?: string;
  filename?: string;
  contentType?: string;
  altText?: string | null;
  url?: string;
};

type NotificationSettings = {
  enabled: boolean;
  reminderTime: string;
  reminderDaysBefore: number;
};

type InventoryPlant = {
  _id: string;
  ownerId?: string;
  nickname: string;
  speciesId?: PlantSpecies | string | null;
  species?: PlantSpecies | null;
  healthStatus?: PlantHealthStatus | LegacyPlantHealthStatus | null;
  healthNotes?: string | null;
  notes?: string | null;
  location?: string | null;
  acquiredAt?: string | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  wateringRemindersEnabled?: boolean;
  notificationSettings?: NotificationSettings | null;
  picture?: PlantPicture | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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

function normalizeCurrentUser(data: unknown): CurrentUser {
  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof (data as { data?: unknown }).data === "object" &&
    (data as { data: { user?: unknown } }).data !== null &&
    typeof (data as { data: { user?: unknown } }).data.user === "object"
  ) {
    return (data as { data: { user: CurrentUser } }).data.user;
  }

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

  if (
    typeof data === "object" &&
    data !== null &&
    "userPlants" in data &&
    Array.isArray((data as { userPlants?: unknown }).userPlants)
  ) {
    return (data as { userPlants: InventoryPlant[] }).userPlants;
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

function normalizeHealthStatus(
  healthStatus?: PlantHealthStatus | LegacyPlantHealthStatus | null,
): PlantHealthStatus {
  const legacyMap: Record<
    LegacyPlantHealthStatus,
    PlantHealthStatus
  > = {
    Healthy: "healthy",
    "Needs attention": "needs-attention",
    "Needs Attention": "needs-attention",
    Sick: "sick",
    Recovering: "recovering",
    Dormant: "dormant",
    Dead: "dead",
  };

  if (!healthStatus) {
    return "healthy";
  }

  if (healthStatus in legacyMap) {
    return legacyMap[healthStatus as LegacyPlantHealthStatus];
  }

  return healthStatus as PlantHealthStatus;
}

function healthLabel(
  healthStatus?: PlantHealthStatus | LegacyPlantHealthStatus | null,
): string {
  const normalizedHealthStatus = normalizeHealthStatus(healthStatus);

  return (
    healthOptions.find(
      (option) => option.value === normalizedHealthStatus,
    )?.label ?? normalizedHealthStatus
  );
}

function getSpecies(plant: InventoryPlant): PlantSpecies | null {
  if (
    plant.speciesId &&
    typeof plant.speciesId === "object"
  ) {
    return plant.speciesId;
  }

  return plant.species ?? null;
}

function getPictureSource(
  picture?: PlantPicture | null,
): string | null {
  if (picture?.url) {
    return picture.url;
  }

  return picture?.fileId
    ? `/api/photos/${picture.fileId}`
    : null;
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

function daysUntil(date?: string | null): number | null {
  if (!date) {
    return null;
  }

  const targetDate = new Date(date);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  return Math.ceil(
    (startOfTarget.getTime() - startOfToday.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function wateringNeedsAttention(plant: InventoryPlant): boolean {
  if (
    plant.wateringRemindersEnabled === false ||
    plant.notificationSettings?.enabled === false
  ) {
    return false;
  }

  const days = daysUntil(plant.nextWateringAt);
  const reminderDaysBefore =
    plant.notificationSettings?.reminderDaysBefore ?? 0;

  return days !== null && days <= reminderDaysBefore;
}

function needsAttention(plant: InventoryPlant): boolean {
  const healthNeedsAttention =
    normalizeHealthStatus(plant.healthStatus) !== "healthy";

  return healthNeedsAttention || wateringNeedsAttention(plant);
}

function PlantInventory() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [plants, setPlants] = useState<InventoryPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

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

  const loadInventory = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        setLoading(true);
        setPageError("");

        const [userResponse, plantsResponse] = await Promise.all([
          apiFetch("/auth/me", {
            signal,
          }),
          apiFetch("/user-plants", {
            signal,
          }),
        ]);

        if (
          redirectOnUnauthorized(userResponse) ||
          redirectOnUnauthorized(plantsResponse)
        ) {
          return;
        }

        if (!userResponse.ok) {
          throw new Error("Your account could not be loaded.");
        }

        if (!plantsResponse.ok) {
          throw new Error("Your plant inventory could not be loaded.");
        }

        const [userData, plantsData] = await Promise.all([
          readJson(userResponse),
          readJson(plantsResponse),
        ]);

        setCurrentUser(normalizeCurrentUser(userData));
        setPlants(normalizePlantsResponse(plantsData));
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
            : "Something went wrong while loading your plants.",
        );
      } finally {
        setLoading(false);
      }
    },
    [redirectOnUnauthorized],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadInventory(controller.signal);

    return () => controller.abort();
  }, [loadInventory]);

  const notificationCount = useMemo(
    () => plants.filter(needsAttention).length,
    [plants],
  );

  const sortedPlants = useMemo(
    () =>
      [...plants].sort((firstPlant, secondPlant) =>
        firstPlant.nickname.localeCompare(secondPlant.nickname),
      ),
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
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate("/garden");
            }}
          >
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
            My Plants
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate("/journal");
            }}
          >
            <span aria-hidden="true">📖</span>
            Journal
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate("/profile");
            }}
          >
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
          aria-label={
            notificationCount > 0
              ? `Open dashboard with ${notificationCount} plant notifications`
              : "Open dashboard"
          }
          onClick={() => navigate("/garden")}
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
            <h1>
              {currentUser
                ? `${currentUser.username}'s plant inventory`
                : "Plant inventory"}
            </h1>
            <p>
              See every plant in your garden and open one to view its
              photos, care history, and details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/garden?modal=add-plant")}
          >
            <span aria-hidden="true">＋</span>
            Add plant
          </button>
        </section>

        {loading ? (
          <section
            className="inventory-state"
            aria-live="polite"
          >
            <span aria-hidden="true">🌱</span>
            <h2>Loading your plants…</h2>
            <p>Gathering your collection from the database.</p>
          </section>
        ) : pageError ? (
          <section className="inventory-state">
            <span aria-hidden="true">🪴</span>
            <h2>Inventory unavailable</h2>
            <p>{pageError}</p>
            <button
              type="button"
              onClick={() => void loadInventory()}
            >
              Try again
            </button>
          </section>
        ) : sortedPlants.length === 0 ? (
          <section className="inventory-state">
            <span aria-hidden="true">🌿</span>
            <h2>No plants yet</h2>
            <p>Add your first plant using the dashboard menu.</p>
            <button
              type="button"
              onClick={() =>
                navigate("/garden?modal=add-plant")
              }
            >
              Add a plant
            </button>
          </section>
        ) : (
          <section
            className="inventory-list"
            aria-label="Your plants"
          >
            {sortedPlants.map((plant) => {
              const species = getSpecies(plant);
              const pictureSource = getPictureSource(plant.picture);
              const attentionNeeded = needsAttention(plant);

              return (
                <button
                  className="inventory-card"
                  type="button"
                  key={plant._id}
                  onClick={() =>
                    navigate(`/plants/${plant._id}`)
                  }
                  aria-label={`Open ${plant.nickname}`}
                >
                  <span className="inventory-card__image">
                    {pictureSource ? (
                      <img
                        src={pictureSource}
                        alt={
                          plant.picture?.altText ||
                          `${plant.nickname} plant`
                        }
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.removeAttribute(
                            "hidden",
                          );
                        }}
                      />
                    ) : null}

                    <span
                      hidden={Boolean(pictureSource)}
                      aria-hidden="true"
                    >
                      🪴
                    </span>
                  </span>

                  <span className="inventory-card__details">
                    <strong>{plant.nickname}</strong>

                    <span>
                      {species?.commonName ||
                        "Plant species not recorded"}
                    </span>

                    {species?.scientificName && (
                      <small>{species.scientificName}</small>
                    )}

                    <small>
                      Last watered:{" "}
                      {formatDate(plant.lastWateredAt)}
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
                      {healthLabel(plant.healthStatus)}
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
