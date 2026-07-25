import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

type CurrentUser = {
  _id: string;
  username: string;
  email: string;
};

type Species = {
  _id: string;
  commonName: string;
  scientificName?: string;
};

type PlantHealthStatus =
  | "healthy"
  | "needs-attention"
  | "sick"
  | "recovering"
  | "dormant"
  | "dead";

type NotificationSettings = {
  enabled: boolean;
  reminderTime: string;
  reminderDaysBefore: number;
};

type PlantPicture = {
  fileId?: string;
  filename?: string;
  contentType?: string;
  altText?: string | null;
  url?: string;
};

type UserPlant = {
  _id: string;
  nickname: string;
  speciesId?: Species | null;
  species?: Species | null;
  healthStatus?: PlantHealthStatus | null;
  healthNotes?: string | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  wateringRemindersEnabled?: boolean;
  notificationSettings?: NotificationSettings | null;
  picture?: PlantPicture | null;
};

type ModalName = "add-plant" | "add-photo" | "log-care" | null;

type AddPlantDraft = {
  nickname: string;
  speciesId: string;
  healthStatus: PlantHealthStatus;
  location: string;
  acquiredAt: string;
  lastWateredAt: string;
  healthNotes: string;
};

type CareType =
  | "watered"
  | "fertilized"
  | "pruned"
  | "repotted"
  | "health-check"
  | "other";

type CareDraft = {
  plantId: string;
  type: CareType;
  entryDate: string;
  notes: string;
  healthStatus: PlantHealthStatus | "";
};

const emptyPlantDraft: AddPlantDraft = {
  nickname: "",
  speciesId: "",
  healthStatus: "healthy",
  location: "",
  acquiredAt: "",
  lastWateredAt: "",
  healthNotes: "",
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

const careTitles: Record<CareType, string> = {
  watered: "Watered",
  fertilized: "Fertilized",
  pruned: "Pruned",
  repotted: "Repotted",
  "health-check": "Health check",
  other: "Plant care",
};

function localDateTimeValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDate(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
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

function normalizeSpecies(data: unknown): Species[] {
  if (Array.isArray(data)) {
    return data as Species[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "species" in data &&
    Array.isArray((data as { species?: unknown }).species)
  ) {
    return (data as { species: Species[] }).species;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "plantSpecies" in data &&
    Array.isArray((data as { plantSpecies?: unknown }).plantSpecies)
  ) {
    return (data as { plantSpecies: Species[] }).plantSpecies;
  }

  return [];
}

async function jsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new Error("The server returned a webpage instead of JSON.");
  }

  return response.json();
}

function plantSpecies(plant: UserPlant): Species | null {
  return plant.speciesId ?? plant.species ?? null;
}

function photoSource(picture?: PlantPicture | null): string | null {
  if (picture?.url) {
    return picture.url;
  }

  return picture?.fileId ? `/api/photos/${picture.fileId}` : null;
}

function daysUntil(date?: string | null): number | null {
  if (!date) {
    return null;
  }

  const target = new Date(date);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function wateringText(nextWateringAt?: string | null): string {
  const days = daysUntil(nextWateringAt);

  if (days === null) {
    return "Watering not scheduled";
  }

  if (days < 0) {
    const overdue = Math.abs(days);
    return `Overdue by ${overdue} ${overdue === 1 ? "day" : "days"}`;
  }

  if (days === 0) {
    return "Water today";
  }

  if (days === 1) {
    return "Water tomorrow";
  }

  return `Water in ${days} days`;
}

function healthLabel(
  healthStatus?: PlantHealthStatus | null,
): string {
  if (!healthStatus) {
    return "Not recorded";
  }

  return (
    healthOptions.find((option) => option.value === healthStatus)?.label ??
    healthStatus
  );
}

function wateringNeedsAction(plant: UserPlant): boolean {
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

function needsCare(plant: UserPlant): boolean {
  const healthNeedsAttention =
    Boolean(plant.healthStatus) && plant.healthStatus !== "healthy";

  return wateringNeedsAction(plant) || healthNeedsAttention;
}

function neededActions(plant: UserPlant): string[] {
  const actions: string[] = [];
  const days = daysUntil(plant.nextWateringAt);

  if (wateringNeedsAction(plant)) {
    if (days !== null && days < 0) {
      const overdue = Math.abs(days);
      actions.push(
        `Watering overdue by ${overdue} ${overdue === 1 ? "day" : "days"}`,
      );
    } else if (days === 0) {
      actions.push("Water today");
    } else if (days === 1) {
      actions.push("Water tomorrow");
    } else if (days !== null) {
      actions.push(`Water in ${days} days`);
    }
  }

  if (plant.healthStatus && plant.healthStatus !== "healthy") {
    actions.push(`Health: ${healthLabel(plant.healthStatus)}`);
  }

  return actions;
}

function PlantImage({
  plant,
  className,
}: {
  plant: UserPlant;
  className: string;
}) {
  const source = photoSource(plant.picture);

  return (
    <span className={className}>
      {source ? (
        <img
          src={source}
          alt={`${plant.nickname} plant`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling?.removeAttribute("hidden");
          }}
        />
      ) : null}
      <span hidden={Boolean(source)} aria-hidden="true">
        🪴
      </span>
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [saving, setSaving] = useState(false);
  const [wateringPlantId, setWateringPlantId] = useState<string | null>(null);

  const [plantDraft, setPlantDraft] =
    useState<AddPlantDraft>(emptyPlantDraft);
  const [photoPlantId, setPhotoPlantId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [careDraft, setCareDraft] = useState<CareDraft>({
    plantId: "",
    type: "watered",
    entryDate: localDateTimeValue(),
    notes: "",
    healthStatus: "",
  });

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

  const loadPlants = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/user-plants", {
      credentials: "include",
    });

    if (redirectOnUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error("Your plants could not be loaded.");
    }

    setPlants(normalizePlants(await jsonResponse(response)));
  }, [redirectOnUnauthorized]);

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setPageError("");

      const [userResponse, plantsResponse] = await Promise.all([
        fetch("/api/auth/me", {
          credentials: "include",
        }),
        fetch("/api/user-plants", {
          credentials: "include",
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
        throw new Error("Your plants could not be loaded.");
      }

      const [userData, plantsData] = await Promise.all([
        jsonResponse(userResponse),
        jsonResponse(plantsResponse),
      ]);

      setCurrentUser(normalizeCurrentUser(userData));
      setPlants(normalizePlants(plantsData));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Your dashboard could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [redirectOnUnauthorized]);

  const loadSpecies = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/plant-species", {
        credentials: "include",
      });

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (response.ok) {
        setSpeciesOptions(normalizeSpecies(await jsonResponse(response)));
      }
    } catch {
      setSpeciesOptions([]);
    }
  }, [redirectOnUnauthorized]);

  useEffect(() => {
    void loadDashboard();
    void loadSpecies();
  }, [loadDashboard, loadSpecies]);

  const carePlants = useMemo(() => plants.filter(needsCare), [plants]);
  const gardenPlants = plants.slice(0, 5);
  const collectionPlants = plants.slice(0, 4);

  function handleNavigation(destination: string): void {
    setMenuOpen(false);
    setNotificationsOpen(false);

    if (
      destination === "/garden" ||
      destination === "/journal" ||
      destination === "/plants" ||
      destination.startsWith("/plants/")
    ) {
      navigate(destination);
      return;
    }

    console.log(`Navigate to: ${destination}`);
  }

  async function handleLogout(): Promise<void> {
    try {
      setLoggingOut(true);
      setMessage("");
      setMenuOpen(false);
      setNotificationsOpen(false);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("You could not be logged out.");
      }

      setCurrentUser(null);
      setPlants([]);
      navigate("/login", { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "You could not be logged out.",
      );
      setLoggingOut(false);
    }
  }

  function openModal(name: Exclude<ModalName, null>): void {
    setNotificationsOpen(false);
    const firstPlantId = plants[0]?._id ?? "";
    setMessage("");
    setModal(name);

    if (name === "add-plant") {
      setPlantDraft({
        ...emptyPlantDraft,
        speciesId: speciesOptions[0]?._id ?? "",
      });
    }

    if (name === "add-photo") {
      setPhotoPlantId(firstPlantId);
      setPhotoFile(null);
    }

    if (name === "log-care") {
      setCareDraft({
        plantId: firstPlantId,
        type: "watered",
        entryDate: localDateTimeValue(),
        notes: "",
        healthStatus: "",
      });
    }
  }

  function closeModal(): void {
    if (!saving) {
      setModal(null);
      setMessage("");
    }
  }

  async function addPlant(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!plantDraft.nickname.trim() || !plantDraft.speciesId) {
      setMessage("Enter a name and choose a species.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/user-plants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: plantDraft.nickname.trim(),
          speciesId: plantDraft.speciesId,
          healthStatus: plantDraft.healthStatus,
          healthNotes: plantDraft.healthNotes.trim() || null,
          location: plantDraft.location.trim() || null,
          acquiredAt: toIsoDate(plantDraft.acquiredAt),
          lastWateredAt: toIsoDate(plantDraft.lastWateredAt),
          wateringRemindersEnabled: true,
          notificationSettings: {
            enabled: true,
            reminderTime: "09:00",
            reminderDaysBefore: 0,
          },
        }),
      });

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error("The plant could not be added.");
      }

      await loadPlants();
      setModal(null);
      setMessage("Plant added.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The plant could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    if (file && !file.type.startsWith("image/")) {
      setPhotoFile(null);
      setMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setPhotoFile(null);
      setMessage("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
    setMessage("");
  }

  async function addPhoto(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!photoPlantId || !photoFile) {
      setMessage("Choose a plant and a photo.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const formData = new FormData();
      formData.append("photo", photoFile);

      const response = await fetch(
        `/api/user-plants/${photoPlantId}/picture`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error("The photo could not be uploaded.");
      }

      await loadPlants();
      setModal(null);
      setMessage("Plant photo updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The photo could not be uploaded.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function logCare(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!careDraft.plantId) {
      setMessage("Choose a plant.");
      return;
    }

    if (careDraft.type === "health-check" && !careDraft.healthStatus) {
      setMessage("Choose a health status.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const entryDate = new Date(careDraft.entryDate).toISOString();
      const title = careTitles[careDraft.type];
      const defaultBody =
        careDraft.type === "watered"
          ? "Watering recorded from the dashboard."
          : `${title} recorded from the dashboard.`;

      const response = await fetch("/api/journal-entries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPlantId: careDraft.plantId,
          title,
          body: careDraft.notes.trim() || defaultBody,
          healthStatus:
            careDraft.type === "health-check"
              ? careDraft.healthStatus
              : null,
          watered: careDraft.type === "watered",
          entryDate,
          photos: [],
        }),
      });

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error("The care activity could not be saved.");
      }

      await loadPlants();
      setModal(null);
      setMessage("Care activity saved to the journal.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The care activity could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markWatered(plantId: string): Promise<void> {
    try {
      setWateringPlantId(plantId);
      setMessage("");

      const response = await fetch(`/api/user-plants/${plantId}/water`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wateredAt: new Date().toISOString() }),
      });

      if (redirectOnUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error("The watering update could not be saved.");
      }

      await loadPlants();
      setMessage("Watering recorded.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The watering update could not be saved.",
      );
    } finally {
      setWateringPlantId(null);
    }
  }

  const profileLabel = currentUser
    ? `Open ${currentUser.username}'s profile`
    : "Open profile";

  const profileInitial =
    currentUser?.username.trim().charAt(0).toUpperCase() || "🪴";

  return (
    <div className="dashboard-page">
      {menuOpen && (
        <button
          className="menu-overlay"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`side-menu ${menuOpen ? "side-menu--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="side-menu__header">
          <div className="side-menu__logo">
            <span aria-hidden="true">🌱</span>
            <span>Pot Buddy</span>
          </div>

          <button
            className="icon-button"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="side-menu__navigation">
          <button
            type="button"
            className="side-menu__link side-menu__link--active"
            onClick={() => handleNavigation("/garden")}
          >
            <span aria-hidden="true">🏠</span>
            Home
          </button>

          <button
            type="button"
            className="side-menu__link"
            onClick={() => handleNavigation("/plants")}
          >
            <span aria-hidden="true">🪴</span>
            My Plants
          </button>

          <button
            type="button"
            className="side-menu__link"
            onClick={() => handleNavigation("/profile")}
          >
            <span aria-hidden="true">👤</span>
            Profile
          </button>

          <button
            type="button"
            className="side-menu__link"
            onClick={() => handleNavigation("/settings")}
          >
            <span aria-hidden="true">⚙️</span>
            Settings
          </button>

          <button
            type="button"
            className="side-menu__link side-menu__link--logout"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <span aria-hidden="true">↪</span>
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>
      </aside>

      <div className="dashboard-container">
        <header className="top-navigation">
          <button
            className="icon-button"
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="hamburger-icon" aria-hidden="true">
              ☰
            </span>
          </button>

          <button
            className="brand-button"
            type="button"
            onClick={() => handleNavigation("/garden")}
          >
            <span aria-hidden="true">🌱</span>
            <span>Pot Buddy</span>
          </button>

          <div className="top-navigation__actions">
            <div className="dashboard-notification-container">
              <button
                className="icon-button notification-button"
                type="button"
                aria-label="Open plant care notifications"
                aria-expanded={notificationsOpen}
                aria-controls="dashboard-notification-menu"
                onClick={() =>
                  setNotificationsOpen((currentlyOpen) => !currentlyOpen)
                }
              >
                <span aria-hidden="true">🔔</span>

                {carePlants.length > 0 && (
                  <span
                    className="notification-badge"
                    aria-label={`${carePlants.length} plants need action`}
                  >
                    {carePlants.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  className="dashboard-notification-menu"
                  id="dashboard-notification-menu"
                  aria-label="Plants needing action"
                >
                  <div className="dashboard-notification-menu__header">
                    <div>
                      <p className="eyebrow">Plant care</p>
                      <h2>Action needed</h2>
                    </div>

                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      ×
                    </button>
                  </div>

                  {carePlants.length > 0 ? (
                    <ul className="dashboard-notification-list">
                      {carePlants.map((plant) => {
                        const actions = neededActions(plant);

                        return (
                          <li key={plant._id}>
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigation(`/plants/${plant._id}`)
                              }
                            >
                              <PlantImage
                                plant={plant}
                                className="dashboard-notification-image"
                              />

                              <span className="dashboard-notification-details">
                                <strong>{plant.nickname}</strong>
                                <span>
                                  {actions.join(" • ") || "Review plant care"}
                                </span>
                              </span>

                              <span aria-hidden="true">→</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="dashboard-notification-empty">
                      <span aria-hidden="true">🌿</span>
                      <strong>Everything looks good</strong>
                      <p>No plants need action right now.</p>
                    </div>
                  )}
                </section>
              )}
            </div>

            <button
              className="profile-button"
              type="button"
              aria-label={profileLabel}
              onClick={() => handleNavigation("/profile")}
            >
              <span aria-hidden="true">{profileInitial}</span>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome-section">
            <p className="eyebrow">Your dashboard</p>
            <h1>
              {currentUser
                ? `Welcome back, ${currentUser.username}`
                : "Welcome to your garden"}
            </h1>
            <p>Keep an eye on your plants and see what needs care today.</p>
          </section>

          {message && (
            <p className="dashboard-action-message" role="status">
              {message}
            </p>
          )}

          {pageError && (
            <p className="dashboard-action-message dashboard-action-message--error">
              {pageError}
            </p>
          )}

          <section className="garden-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Visual garden</p>
                <h2>Your Garden</h2>
              </div>

              <span className="plant-count">
                {plants.length} {plants.length === 1 ? "plant" : "plants"}
              </span>
            </div>

            <div className="garden-visual">
              <div className="garden-sun" aria-hidden="true">
                ☀️
              </div>

              <div className="garden-plants">
                {loading ? (
                  <span className="dashboard-inline-state">
                    Loading plants…
                  </span>
                ) : gardenPlants.length > 0 ? (
                  gardenPlants.map((plant, index) => (
                    <button
                      key={plant._id}
                      type="button"
                      className={`garden-plant garden-plant--${index + 1}`}
                      aria-label={`Open ${plant.nickname}`}
                      onClick={() =>
                        handleNavigation(`/plants/${plant._id}`)
                      }
                    >
                      <PlantImage
                        plant={plant}
                        className="garden-plant__emoji"
                      />
                      <span className="garden-plant__name">
                        {plant.nickname}
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="dashboard-inline-state">
                    Add your first plant to begin your garden.
                  </span>
                )}
              </div>

              <div className="garden-ground" aria-hidden="true" />
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => handleNavigation("/plants")}
            >
              View full garden
              <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="care-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Today's care</p>
                <h2>Action needed</h2>
              </div>

              <span className="task-count">{carePlants.length}</span>
            </div>

            {carePlants.length > 0 ? (
              <div className="care-list">
                {carePlants.map((plant) => (
                  <article className="care-card" key={plant._id}>
                    <button
                      className="care-card__plant"
                      type="button"
                      onClick={() =>
                        handleNavigation(`/plants/${plant._id}`)
                      }
                    >
                      <PlantImage
                        plant={plant}
                        className="care-card__image"
                      />

                      <span className="care-card__information">
                        <strong>{plant.nickname}</strong>
                        <span>
                          {plantSpecies(plant)?.commonName ||
                            "Species not recorded"}
                        </span>
                        <span
                          className={`health-status ${
                            plant.healthStatus === "healthy"
                              ? "health-status--healthy"
                              : "health-status--warning"
                          }`}
                        >
                          {healthLabel(plant.healthStatus)}
                        </span>
                      </span>
                    </button>

                    <div className="care-card__action">
                      <span className="watering-label">
                        <span aria-hidden="true">💧</span>
                        {wateringText(plant.nextWateringAt)}
                      </span>

                      <button
                        className="water-button"
                        type="button"
                        disabled={wateringPlantId === plant._id}
                        onClick={() => void markWatered(plant._id)}
                      >
                        {wateringPlantId === plant._id
                          ? "Saving…"
                          : "Mark watered"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-care-state">
                <span aria-hidden="true">🌿</span>
                <h3>Everything looks good</h3>
                <p>No plants need immediate care today.</p>
              </div>
            )}
          </section>

          <section className="plant-summary-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Collection</p>
                <h2>My plants</h2>
              </div>

              <button
                className="text-button"
                type="button"
                onClick={() => handleNavigation("/plants")}
              >
                See all
              </button>
            </div>

            <div className="plant-summary-grid">
              {collectionPlants.map((plant) => (
                <button
                  className="plant-summary-card"
                  type="button"
                  key={plant._id}
                  onClick={() =>
                    handleNavigation(`/plants/${plant._id}`)
                  }
                >
                  <PlantImage
                    plant={plant}
                    className="plant-summary-card__image"
                  />

                  <span className="plant-summary-card__details">
                    <strong>{plant.nickname}</strong>
                    <span>
                      {plantSpecies(plant)?.commonName ||
                        "Species not recorded"}
                    </span>
                    <small>{wateringText(plant.nextWateringAt)}</small>
                  </span>
                </button>
              ))}

              {!loading && collectionPlants.length === 0 && (
                <div className="dashboard-collection-empty">
                  No plants have been added yet.
                </div>
              )}
            </div>
          </section>
        </main>

        <nav className="quick-action-navigation">
          <button type="button" onClick={() => openModal("add-plant")}>
            <span className="quick-action-navigation__icon">＋</span>
            <span>Add plant</span>
          </button>

          <button
            type="button"
            disabled={plants.length === 0}
            onClick={() => openModal("log-care")}
          >
            <span className="quick-action-navigation__icon">💧</span>
            <span>Log care</span>
          </button>

          <button
            type="button"
            disabled={plants.length === 0}
            onClick={() => openModal("add-photo")}
          >
            <span className="quick-action-navigation__icon">📷</span>
            <span>Add photo</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation("/journal")}
          >
            <span className="quick-action-navigation__icon">📖</span>
            <span>Journal</span>
          </button>
        </nav>
      </div>

      {modal && (
        <div
          className="dashboard-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="dashboard-action-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-action-title"
          >
            <div className="dashboard-action-dialog__header">
              <div>
                <p className="eyebrow">Quick action</p>
                <h2 id="dashboard-action-title">
                  {modal === "add-plant" && "Add a plant"}
                  {modal === "add-photo" && "Add a plant photo"}
                  {modal === "log-care" && "Log plant care"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close form"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {message && (
              <p className="dashboard-dialog-message" role="status">
                {message}
              </p>
            )}

            {modal === "add-plant" && (
              <form
                className="dashboard-action-form"
                onSubmit={(event) => void addPlant(event)}
              >
                <label>
                  Plant nickname
                  <input
                    type="text"
                    value={plantDraft.nickname}
                    maxLength={60}
                    required
                    onChange={(event) =>
                      setPlantDraft((draft) => ({
                        ...draft,
                        nickname: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Species
                  <select
                    value={plantDraft.speciesId}
                    required
                    disabled={speciesOptions.length === 0}
                    onChange={(event) =>
                      setPlantDraft((draft) => ({
                        ...draft,
                        speciesId: event.target.value,
                      }))
                    }
                  >
                    {speciesOptions.length === 0 ? (
                      <option value="">Species catalog unavailable</option>
                    ) : (
                      speciesOptions.map((species) => (
                        <option value={species._id} key={species._id}>
                          {species.commonName}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <div className="dashboard-action-form__row">
                  <label>
                    Health status
                    <select
                      value={plantDraft.healthStatus}
                      onChange={(event) =>
                        setPlantDraft((draft) => ({
                          ...draft,
                          healthStatus: event.target.value,
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
                    Acquired date
                    <input
                      type="date"
                      value={plantDraft.acquiredAt}
                      onChange={(event) =>
                        setPlantDraft((draft) => ({
                          ...draft,
                          acquiredAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label>
                  Location
                  <input
                    type="text"
                    value={plantDraft.location}
                    maxLength={80}
                    placeholder="Living room, kitchen, bedroom..."
                    onChange={(event) =>
                      setPlantDraft((draft) => ({
                        ...draft,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Last watered
                  <input
                    type="date"
                    value={plantDraft.lastWateredAt}
                    onChange={(event) =>
                      setPlantDraft((draft) => ({
                        ...draft,
                        lastWateredAt: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Health notes
                  <textarea
                    value={plantDraft.healthNotes}
                    rows={4}
                    maxLength={3000}
                    onChange={(event) =>
                      setPlantDraft((draft) => ({
                        ...draft,
                        healthNotes: event.target.value,
                      }))
                    }
                  />
                </label>

                <button type="submit" disabled={saving}>
                  {saving ? "Adding…" : "Add plant"}
                </button>
              </form>
            )}

            {modal === "add-photo" && (
              <form
                className="dashboard-action-form"
                onSubmit={(event) => void addPhoto(event)}
              >
                <label>
                  Plant
                  <select
                    value={photoPlantId}
                    required
                    onChange={(event) =>
                      setPhotoPlantId(event.target.value)
                    }
                  >
                    {plants.map((plant) => (
                      <option value={plant._id} key={plant._id}>
                        {plant.nickname}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="dashboard-file-name">
                  This sets or replaces the plant's featured picture.
                </p>

                <label>
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={selectPhoto}
                  />
                </label>

                {photoFile && (
                  <p className="dashboard-file-name">{photoFile.name}</p>
                )}

                <button type="submit" disabled={saving}>
                  {saving ? "Uploading…" : "Add photo"}
                </button>
              </form>
            )}

            {modal === "log-care" && (
              <form
                className="dashboard-action-form"
                onSubmit={(event) => void logCare(event)}
              >
                <label>
                  Plant
                  <select
                    value={careDraft.plantId}
                    required
                    onChange={(event) =>
                      setCareDraft((draft) => ({
                        ...draft,
                        plantId: event.target.value,
                      }))
                    }
                  >
                    {plants.map((plant) => (
                      <option value={plant._id} key={plant._id}>
                        {plant.nickname}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="dashboard-action-form__row">
                  <label>
                    Care type
                    <select
                      value={careDraft.type}
                      onChange={(event) =>
                        setCareDraft((draft) => ({
                          ...draft,
                          type: event.target.value as CareType,
                        }))
                      }
                    >
                      <option value="watered">Watered</option>
                      <option value="fertilized">Fertilized</option>
                      <option value="pruned">Pruned</option>
                      <option value="repotted">Repotted</option>
                      <option value="health-check">Health check</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label>
                    Date and time
                    <input
                      type="datetime-local"
                      value={careDraft.entryDate}
                      required
                      onChange={(event) =>
                        setCareDraft((draft) => ({
                          ...draft,
                          entryDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {careDraft.type === "health-check" && (
                  <label>
                    Health status
                    <select
                      value={careDraft.healthStatus}
                      required
                      onChange={(event) =>
                        setCareDraft((draft) => ({
                          ...draft,
                          healthStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choose a status</option>
                      {healthOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  Notes
                  <textarea
                    value={careDraft.notes}
                    rows={4}
                    maxLength={1000}
                    placeholder="What care did you provide?"
                    onChange={(event) =>
                      setCareDraft((draft) => ({
                        ...draft,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>

                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save care"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
