import type { ChangeEvent, FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlantCareGuide from "../components/PlantCareGuide";
import "./PlantDetail.css";

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
  _id?: string;
  id?: string;
  username: string;
  email: string;
};

type Disease = {
  name: string;
  symptoms: string[];
  cause: string;
  treatment: string[];
};

type PlantSpecies = {
  _id?: string;

  commonName?: string;
  scientificName?: string;
  description?: string;

  sunlight?: {
    level: string;
    instructions: string;
  };

  watering?: {
    intervalDays: number;
    instructions: string;
    warningSigns?: string[];
  };

  humidity?: {
    level: string;
    instructions: string;
  };

  temperature?: {
    minimum: number;
    maximum: number;
    unit: string;
  };

  soil?: string;

  fertilizing?: {
    intervalDays?: number;
    instructions?: string;
  };

  toxicity?: {
    toxicToPets: boolean;
    notes?: string;
  };

  commonDiseases?: Disease[];

  additionalCareNotes?: string[];
};

type PlantPicture = {
  fileId?: string;
  filename?: string;
  contentType?: string;
  altText?: string | null;
  url?: string;
  alt?: string;
};

type NotificationSettings = {
  enabled: boolean;
  reminderTime: string;
  reminderDaysBefore: number;
};

type PlantDetailData = {
  _id: string;
  ownerId?: string;
  speciesId?: PlantSpecies | string | null;
  species?: PlantSpecies | null;
  nickname: string;
  picture?: PlantPicture | null;
  healthStatus?: PlantHealthStatus | LegacyPlantHealthStatus | null;
  healthNotes?: string | null;
  notes?: string | null;
  location?: string | null;
  acquiredAt?: string | null;
  lastWateredAt?: string | null;
  nextWateringAt?: string | null;
  wateringRemindersEnabled?: boolean;
  notificationSettings?: NotificationSettings | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type JournalPhoto = {
  fileId?: string;
  filename?: string;
  contentType?: string;
  caption?: string | null;
};

type PopulatedJournalPlant = {
  _id: string;
  nickname?: string;
};

type JournalEntryApi = {
  _id?: string;
  id?: string;
  userPlantId?: PopulatedJournalPlant | string;
  plantId?: PopulatedJournalPlant | string;
  title?: string | null;
  body?: string;
  notes?: string;
  healthStatus?: PlantHealthStatus | LegacyPlantHealthStatus | null;
  health?: PlantHealthStatus | LegacyPlantHealthStatus | null;
  watered?: boolean;
  entryDate?: string;
  occurredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  photos?: JournalPhoto[];
};

type CareEventType =
  | "watered"
  | "photo"
  | "journal"
  | "health"
  | "added";

type CareEvent = {
  _id: string;
  type: CareEventType;
  title: string;
  details?: string;
  occurredAt: string;
};

type PlantEditDraft = {
  nickname: string;
  healthStatus: PlantHealthStatus;
  healthNotes: string;
  location: string;
  acquiredAt: string;
  lastWateredAt: string;
  nextWateringAt: string;
  wateringRemindersEnabled: boolean;
  notificationEnabled: boolean;
  reminderTime: string;
  reminderDaysBefore: string;
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
    (data as { data?: unknown }).data !== null
  ) {
    const nestedData = (
      data as {
        data: {
          user?: unknown;
        };
      }
    ).data;

    if (
      typeof nestedData.user === "object" &&
      nestedData.user !== null
    ) {
      return nestedData.user as CurrentUser;
    }
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "user" in data &&
    typeof (data as { user?: unknown }).user === "object" &&
    (data as { user?: unknown }).user !== null
  ) {
    return (data as { user: CurrentUser }).user;
  }

  return data as CurrentUser;
}

function normalizePlantResponse(data: unknown): PlantDetailData {
  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof (data as { data?: unknown }).data === "object" &&
    (data as { data?: unknown }).data !== null
  ) {
    const nestedData = (
      data as {
        data: {
          plant?: unknown;
          userPlant?: unknown;
        };
      }
    ).data;

    if (
      typeof nestedData.plant === "object" &&
      nestedData.plant !== null
    ) {
      return nestedData.plant as PlantDetailData;
    }

    if (
      typeof nestedData.userPlant === "object" &&
      nestedData.userPlant !== null
    ) {
      return nestedData.userPlant as PlantDetailData;
    }
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "plant" in data &&
    typeof (data as { plant?: unknown }).plant === "object" &&
    (data as { plant?: unknown }).plant !== null
  ) {
    return (data as { plant: PlantDetailData }).plant;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "userPlant" in data &&
    typeof (data as { userPlant?: unknown }).userPlant === "object" &&
    (data as { userPlant?: unknown }).userPlant !== null
  ) {
    return (data as { userPlant: PlantDetailData }).userPlant;
  }

  return data as PlantDetailData;
}

function normalizeJournalEntries(data: unknown): JournalEntryApi[] {
  if (Array.isArray(data)) {
    return data as JournalEntryApi[];
  }

  if (typeof data !== "object" || data === null) {
    return [];
  }

  const response = data as {
    entries?: unknown;
    journalEntries?: unknown;
    data?: unknown;
  };

  if (Array.isArray(response.entries)) {
    return response.entries as JournalEntryApi[];
  }

  if (Array.isArray(response.journalEntries)) {
    return response.journalEntries as JournalEntryApi[];
  }

  if (Array.isArray(response.data)) {
    return response.data as JournalEntryApi[];
  }

  if (
    typeof response.data === "object" &&
    response.data !== null
  ) {
    const nestedData = response.data as {
      entries?: unknown;
      journalEntries?: unknown;
    };

    if (Array.isArray(nestedData.entries)) {
      return nestedData.entries as JournalEntryApi[];
    }

    if (Array.isArray(nestedData.journalEntries)) {
      return nestedData.journalEntries as JournalEntryApi[];
    }
  }

  return [];
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new Error(
      "The server returned a webpage instead of JSON data.",
    );
  }

  return response.json();
}

async function responseError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = (await response.json()) as unknown;

    if (typeof data === "object" && data !== null) {
      if (
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
      ) {
        return (data as { message: string }).message;
      }

      if (
        "error" in data &&
        typeof (data as { error?: unknown }).error === "string"
      ) {
        return (data as { error: string }).error;
      }
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

function normalizeHealthStatus(
  healthStatus?:
    | PlantHealthStatus
    | LegacyPlantHealthStatus
    | null,
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
    return legacyMap[
      healthStatus as LegacyPlantHealthStatus
    ];
  }

  return healthStatus as PlantHealthStatus;
}

function healthLabel(
  healthStatus?:
    | PlantHealthStatus
    | LegacyPlantHealthStatus
    | null,
): string {
  const normalizedHealthStatus =
    normalizeHealthStatus(healthStatus);

  return (
    healthOptions.find(
      (option) =>
        option.value === normalizedHealthStatus,
    )?.label ?? normalizedHealthStatus
  );
}

function getPlantSpecies(
  plant?: PlantDetailData | null,
): PlantSpecies | null {
  if (!plant) {
    return null;
  }

  if (
    plant.speciesId &&
    typeof plant.speciesId === "object"
  ) {
    return plant.speciesId;
  }

  return plant.species ?? null;
}

function getPhotoSource(
  photo?: PlantPicture | null,
): string | null {
  if (photo?.url) {
    return photo.url;
  }

  return photo?.fileId
    ? `${apiBaseUrl}/photos/${photo.fileId}`
    : null;
}

function toDateInputValue(
  date?: string | null,
): string {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const timezoneOffset =
    parsedDate.getTimezoneOffset() * 60_000;

  return new Date(
    parsedDate.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}

function dateInputToIso(
  date: string,
): string | null {
  return date
    ? new Date(`${date}T12:00:00`).toISOString()
    : null;
}

function formatDate(
  date?: string | null,
): string {
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

function formatTimelineDate(
  date: string,
): string {
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

function getTimelineIcon(
  type: CareEventType,
): string {
  const icons: Record<CareEventType, string> = {
    watered: "💧",
    photo: "📷",
    journal: "📖",
    health: "🌿",
    added: "🪴",
  };

  return icons[type];
}

function getJournalPlantId(
  entry: JournalEntryApi,
): string {
  const plantReference =
    entry.userPlantId ?? entry.plantId;

  if (!plantReference) {
    return "";
  }

  return typeof plantReference === "string"
    ? plantReference
    : plantReference._id;
}

function getJournalDate(
  entry: JournalEntryApi,
): string | null {
  return (
    entry.entryDate ??
    entry.occurredAt ??
    entry.createdAt ??
    entry.updatedAt ??
    null
  );
}

function createTimeline(
  plant: PlantDetailData,
  entries: JournalEntryApi[],
): CareEvent[] {
  const events: CareEvent[] = entries
    .filter(
      (entry) =>
        getJournalPlantId(entry) === plant._id,
    )
    .flatMap(
      (
        entry,
        index,
      ): CareEvent[] => {
        const occurredAt =
          getJournalDate(entry);

        if (!occurredAt) {
          return [];
        }

        const normalizedHealthStatus =
          entry.healthStatus ??
          entry.health;

        const hasPhotos =
          Array.isArray(entry.photos) &&
          entry.photos.length > 0;

        let type: CareEventType =
          "journal";

        if (entry.watered) {
          type = "watered";
        } else if (hasPhotos) {
          type = "photo";
        } else if (
          normalizedHealthStatus
        ) {
          type = "health";
        }

        const defaultTitle =
          type === "watered"
            ? "Plant watered"
            : type === "photo"
              ? "Photo added"
              : type === "health"
                ? `Health: ${healthLabel(
                    normalizedHealthStatus,
                  )}`
                : "Journal entry";

        return [
          {
            _id:
              entry._id ??
              entry.id ??
              `journal-${occurredAt}-${index}`,

            type,

            title:
              entry.title?.trim() ||
              defaultTitle,

            details:
              entry.body?.trim() ||
              entry.notes?.trim() ||
              undefined,

            occurredAt,
          },
        ];
      },
    );

  if (plant.createdAt) {
    events.push({
      _id: `plant-added-${plant._id}`,
      type: "added",
      title: "Added to the garden",
      details: `${plant.nickname} joined your PotBuddy collection.`,
      occurredAt: plant.createdAt,
    });
  }

  if (plant.lastWateredAt) {
    const lastWateredTime =
      new Date(
        plant.lastWateredAt,
      ).getTime();

    const alreadyRecorded =
      events.some((event) => {
        if (
          event.type !== "watered"
        ) {
          return false;
        }

        const eventTime =
          new Date(
            event.occurredAt,
          ).getTime();

        return (
          Number.isFinite(eventTime) &&
          Number.isFinite(
            lastWateredTime,
          ) &&
          Math.abs(
            eventTime -
              lastWateredTime,
          ) <
            60 * 60 * 1000
        );
      });

    if (!alreadyRecorded) {
      events.push({
        _id: `last-watered-${plant._id}`,
        type: "watered",
        title: "Plant watered",
        details: `Last watering recorded for ${plant.nickname}.`,
        occurredAt:
          plant.lastWateredAt,
      });
    }
  }

  return events.sort(
    (
      firstEvent,
      secondEvent,
    ) =>
      new Date(
        secondEvent.occurredAt,
      ).getTime() -
      new Date(
        firstEvent.occurredAt,
      ).getTime(),
  );
}

function createEditDraft(
  plant: PlantDetailData,
): PlantEditDraft {
  const notificationSettings =
    plant.notificationSettings;

  return {
    nickname: plant.nickname,

    healthStatus:
      normalizeHealthStatus(
        plant.healthStatus,
      ),

    healthNotes:
      plant.healthNotes ??
      plant.notes ??
      "",

    location:
      plant.location ?? "",

    acquiredAt:
      toDateInputValue(
        plant.acquiredAt,
      ),

    lastWateredAt:
      toDateInputValue(
        plant.lastWateredAt,
      ),

    nextWateringAt:
      toDateInputValue(
        plant.nextWateringAt,
      ),

    wateringRemindersEnabled:
      plant.wateringRemindersEnabled ??
      true,

    notificationEnabled:
      notificationSettings?.enabled ??
      true,

    reminderTime:
      notificationSettings
        ?.reminderTime ??
      "09:00",

    reminderDaysBefore:
      String(
        notificationSettings
          ?.reminderDaysBefore ??
          0,
      ),
  };
}

function PlantDetail() {
  const navigate = useNavigate();

  const { plantId } =
    useParams<{
      plantId: string;
    }>();

  const photoInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    currentUser,
    setCurrentUser,
  ] = useState<CurrentUser | null>(
    null,
  );

  const [
    plant,
    setPlant,
  ] = useState<PlantDetailData | null>(
    null,
  );

  const [
    journalEntries,
    setJournalEntries,
  ] = useState<JournalEntryApi[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    timelineError,
    setTimelineError,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    watering,
    setWatering,
  ] = useState(false);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  const [
    editDraft,
    setEditDraft,
  ] = useState<PlantEditDraft | null>(
    null,
  );

  const redirectOnUnauthorized =
    useCallback(
      (
        response: Response,
      ): boolean => {
        if (
          response.status === 401
        ) {
          localStorage.removeItem(
            "potbuddyToken",
          );

          localStorage.removeItem(
            "potbuddyUser",
          );

          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return true;
        }

        return false;
      },
      [navigate],
    );

  const loadPlant =
    useCallback(
      async (
        signal?: AbortSignal,
      ): Promise<void> => {
        if (!plantId) {
          setPageError(
            "No plant was selected.",
          );

          setLoading(false);
          return;
        }

        const response =
          await apiFetch(
            `/plants/${plantId}`,
            {
              signal,
            },
          );

        if (
          redirectOnUnauthorized(
            response,
          )
        ) {
          return;
        }

        if (!response.ok) {
          const message =
            await responseError(
              response,

              response.status === 404
                ? "This plant could not be found."
                : "The plant details could not be loaded.",
            );

          throw new Error(
            message,
          );
        }

        const responseData =
          await readJson(response);

        setPlant(
          normalizePlantResponse(
            responseData,
          ),
        );
      },
      [
        plantId,
        redirectOnUnauthorized,
      ],
    );

  const loadJournalEntries =
    useCallback(
      async (
        signal?: AbortSignal,
      ): Promise<void> => {
        try {
          setTimelineError("");

          const response =
            await apiFetch(
              "/journal-entries",
              {
                signal,
              },
            );

          if (
            redirectOnUnauthorized(
              response,
            )
          ) {
            return;
          }

          if (
            response.status === 404 ||
            response.status === 405
          ) {
            setJournalEntries(
              [],
            );

            setTimelineError(
              "Journal history is not available from the API yet.",
            );

            return;
          }

          if (!response.ok) {
            throw new Error(
              "Recent plant activity could not be loaded.",
            );
          }

          const responseData =
            await readJson(
              response,
            );

          setJournalEntries(
            normalizeJournalEntries(
              responseData,
            ),
          );
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setJournalEntries([]);

          setTimelineError(
            error instanceof Error
              ? error.message
              : "Recent plant activity could not be loaded.",
          );
        }
      },
      [
        redirectOnUnauthorized,
      ],
    );

  const loadPage =
    useCallback(
      async (
        signal?: AbortSignal,
      ): Promise<void> => {
        if (!plantId) {
          setPageError(
            "No plant was selected.",
          );

          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setPageError("");

          const userResponse =
            await apiFetch(
              "/auth/me",
              {
                signal,
              },
            );

          if (
            redirectOnUnauthorized(
              userResponse,
            )
          ) {
            return;
          }

          if (!userResponse.ok) {
            const message =
              await responseError(
                userResponse,

                "Your account could not be loaded.",
              );

            throw new Error(
              message,
            );
          }

          const userData =
            await readJson(
              userResponse,
            );

          setCurrentUser(
            normalizeCurrentUser(
              userData,
            ),
          );

          await Promise.all([
            loadPlant(signal),

            loadJournalEntries(
              signal,
            ),
          ]);
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setPageError(
            error instanceof Error
              ? error.message
              : "This plant could not be loaded.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        loadJournalEntries,
        loadPlant,
        plantId,
        redirectOnUnauthorized,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadPage(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadPage]);

  const species = useMemo(
    () =>
      getPlantSpecies(plant),
    [plant],
  );

  const featuredPhoto =
    useMemo(
      () =>
        getPhotoSource(
          plant?.picture,
        ),
      [plant?.picture],
    );

  const careTimeline =
    useMemo(
      () =>
        plant
          ? createTimeline(
              plant,
              journalEntries,
            )
          : [],
      [
        journalEntries,
        plant,
      ],
    );

  async function handleWaterPlant(): Promise<void> {
    if (
      !plantId ||
      !plant ||
      watering
    ) {
      return;
    }

    try {
      setWatering(true);
      setActionMessage("");

      const response =
        await apiFetch(
          `/plants/${plantId}/water`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              wateredAt:
                new Date().toISOString(),
            }),
          },
        );

      if (
        redirectOnUnauthorized(
          response,
        )
      ) {
        return;
      }

      if (!response.ok) {
        const message =
          await responseError(
            response,

            "The watering update could not be saved.",
          );

        throw new Error(
          message,
        );
      }

      await Promise.all([
        loadPlant(),

        loadJournalEntries(),
      ]);

      setActionMessage(
        "Watering recorded.",
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The watering update could not be saved.",
      );
    } finally {
      setWatering(false);
    }
  }

  function handleJournalEntry(): void {
    if (plantId) {
      navigate(
        `/journal?plantId=${encodeURIComponent(
          plantId,
        )}`,
      );
    }
  }

  function openPhotoPicker(): void {
    photoInputRef.current?.click();
  }

  async function handlePhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFile =
      event.target.files?.[0];

    if (
      !selectedFile ||
      !plantId
    ) {
      return;
    }

    if (
      !selectedFile.type.startsWith(
        "image/",
      )
    ) {
      setActionMessage(
        "Please choose an image file.",
      );

      event.target.value = "";
      return;
    }

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {
      setActionMessage(
        "Please choose an image smaller than 10 MB.",
      );

      event.target.value = "";
      return;
    }

    const createPhotoFormData =
      (): FormData => {
        const formData =
          new FormData();

        formData.append(
          "photo",
          selectedFile,
        );

        return formData;
      };

    try {
      setUploadingPhoto(true);
      setActionMessage("");

      /*
       * Main new upload endpoint:
       *
       * POST /api/plants/:id/photos
       */
      let response =
        await apiFetch(
          `/plants/${plantId}/photos`,
          {
            method: "POST",

            /*
             * Do not manually set
             * Content-Type here.
             *
             * The browser must create
             * the multipart boundary.
             */
            body:
              createPhotoFormData(),
          },
        );

      /*
       * Compatibility endpoint:
       *
       * POST /api/plants/:id/picture
       */
      if (
        response.status === 404 ||
        response.status === 405
      ) {
        response =
          await apiFetch(
            `/plants/${plantId}/picture`,
            {
              method: "POST",

              body:
                createPhotoFormData(),
            },
          );
      }

      if (
        redirectOnUnauthorized(
          response,
        )
      ) {
        return;
      }

      if (!response.ok) {
        const message =
          await responseError(
            response,

            "The photo could not be uploaded.",
          );

        throw new Error(
          message,
        );
      }

      /*
       * photoController returns:
       *
       * {
       *   success: true,
       *   picture: {...},
       *   plant: {...}
       * }
       *
       * Use the returned plant immediately
       * so the new image appears without
       * requiring a page refresh.
       */
      const contentType =
        response.headers.get(
          "content-type",
        );

      if (
        contentType?.includes(
          "application/json",
        )
      ) {
        const responseData =
          await response.json();

        setPlant(
          normalizePlantResponse(
            responseData,
          ),
        );
      } else {
        await loadPlant();
      }

      setActionMessage(
        "Plant photo saved and added to this plant.",
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
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

    setEditDraft(
      createEditDraft(plant),
    );

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

    if (
      !plantId ||
      !plant ||
      !editDraft ||
      savingEdit
    ) {
      return;
    }

    const nickname =
      editDraft.nickname.trim();

    const reminderDaysBefore =
      Number(
        editDraft.reminderDaysBefore,
      );

    if (!nickname) {
      setActionMessage(
        "Plant name is required.",
      );

      return;
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        editDraft.reminderTime,
      )
    ) {
      setActionMessage(
        "Reminder time must use HH:MM format.",
      );

      return;
    }

    if (
      !Number.isFinite(
        reminderDaysBefore,
      ) ||
      reminderDaysBefore < 0
    ) {
      setActionMessage(
        "Reminder days must be zero or greater.",
      );

      return;
    }

    const healthNotes =
      editDraft.healthNotes.trim() ||
      null;

    const updatePayload = {
      nickname,

      healthStatus:
        editDraft.healthStatus,

      health: healthLabel(
        editDraft.healthStatus,
      ),

      healthNotes,
      notes: healthNotes,

      location:
        editDraft.location.trim() ||
        null,

      acquiredAt:
        dateInputToIso(
          editDraft.acquiredAt,
        ),

      lastWateredAt:
        dateInputToIso(
          editDraft.lastWateredAt,
        ),

      nextWateringAt:
        dateInputToIso(
          editDraft.nextWateringAt,
        ),

      wateringRemindersEnabled:
        editDraft
          .wateringRemindersEnabled,

      notificationSettings: {
        enabled:
          editDraft
            .notificationEnabled,

        reminderTime:
          editDraft.reminderTime,

        reminderDaysBefore,
      },
    };

    try {
      setSavingEdit(true);
      setActionMessage("");

      const response =
        await apiFetch(
          `/plants/${plantId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              updatePayload,
            ),
          },
        );

      if (
        redirectOnUnauthorized(
          response,
        )
      ) {
        return;
      }

      if (!response.ok) {
        const message =
          await responseError(
            response,

            "The plant changes could not be saved.",
          );

        throw new Error(
          message,
        );
      }

      const contentType =
        response.headers.get(
          "content-type",
        );

      if (
        contentType?.includes(
          "application/json",
        )
      ) {
        const responseData =
          await response.json();

        setPlant(
          normalizePlantResponse(
            responseData,
          ),
        );
      } else {
        await loadPlant();
      }

      setEditing(false);
      setEditDraft(null);

      setActionMessage(
        "Plant details updated.",
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The plant changes could not be saved.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePlant(): Promise<void> {
    if (
      !plantId ||
      !plant ||
      deleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${plant.nickname}? This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setActionMessage("");

      const response =
        await apiFetch(
          `/plants/${plantId}`,
          {
            method: "DELETE",
          },
        );

      if (
        redirectOnUnauthorized(
          response,
        )
      ) {
        return;
      }

      if (!response.ok) {
        const message =
          await responseError(
            response,

            "The plant could not be deleted.",
          );

        throw new Error(
          message,
        );
      }

      navigate("/plants");
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The plant could not be deleted.",
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="plant-detail-page">
        <main
          className="plant-detail-state"
          aria-live="polite"
        >
          <span
            className="plant-detail-state__icon"
            aria-hidden="true"
          >
            🌱
          </span>

          <h1>
            Loading plant…
          </h1>

          <p>
            Gathering plant details and
            journal history.
          </p>
        </main>
      </div>
    );
  }

  if (
    pageError ||
    !plant
  ) {
    return (
      <div className="plant-detail-page">
        <main className="plant-detail-state">
          <span
            className="plant-detail-state__icon"
            aria-hidden="true"
          >
            🪴
          </span>

          <h1>
            Plant unavailable
          </h1>

          <p>
            {pageError ||
              "This plant could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/plants")
            }
          >
            Back to my plants
          </button>
        </main>
      </div>
    );
  }

  const reminderSettings =
    plant.notificationSettings;

  const remindersOn =
    plant
      .wateringRemindersEnabled !==
      false &&
    reminderSettings?.enabled !==
      false;

  return (
    <div className="plant-detail-page">
      <header className="plant-detail-header">
        <button
          className="plant-detail-header__button"
          type="button"
          aria-label="Back to my plants"
          onClick={() =>
            navigate("/plants")
          }
        >
          ←
        </button>

        <div className="plant-detail-header__brand">
          <span aria-hidden="true">
            🌱
          </span>

          <span>
            Plant details
          </span>
        </div>

        <button
          className="plant-detail-header__button"
          type="button"
          aria-label={
            currentUser
              ? `Open ${currentUser.username}'s profile`
              : "Open profile"
          }
          onClick={() =>
            navigate("/profile")
          }
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
                alt={
                  plant.picture
                    ?.altText ||
                  plant.picture?.alt ||
                  `${plant.nickname} plant`
                }
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";

                  event.currentTarget.nextElementSibling?.removeAttribute(
                    "hidden",
                  );
                }}
              />
            ) : null}

            <div
              className="plant-detail-photo-card__empty"
              hidden={Boolean(
                featuredPhoto,
              )}
            >
              <span aria-hidden="true">
                🪴
              </span>

              <strong>
                No plant photo yet
              </strong>

              <button
                type="button"
                onClick={
                  openPhotoPicker
                }
              >
                Add the first photo
              </button>
            </div>
          </div>

          <div className="plant-detail-summary">
            {editing &&
            editDraft ? (
              <form
                className="plant-detail-edit-form"
                onSubmit={(event) =>
                  void handleEditSubmit(
                    event,
                  )
                }
              >
                <div className="plant-detail-edit-form__heading">
                  <div>
                    <p className="plant-detail-eyebrow">
                      Editing
                    </p>

                    <h1>
                      Edit plant details
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                  >
                    Cancel
                  </button>
                </div>

                <label>
                  Plant name

                  <input
                    type="text"
                    value={
                      editDraft.nickname
                    }
                    maxLength={100}
                    required
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                nickname:
                                  event
                                    .target
                                    .value,
                              }
                            : currentDraft,
                      )
                    }
                  />
                </label>

                <label>
                  Health status

                  <select
                    value={
                      editDraft
                        .healthStatus
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                healthStatus:
                                  event
                                    .target
                                    .value as PlantHealthStatus,
                              }
                            : currentDraft,
                      )
                    }
                  >
                    {healthOptions.map(
                      (option) => (
                        <option
                          value={
                            option.value
                          }
                          key={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Location

                  <input
                    type="text"
                    value={
                      editDraft.location
                    }
                    maxLength={200}
                    placeholder="Living room, kitchen, bedroom..."
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                location:
                                  event
                                    .target
                                    .value,
                              }
                            : currentDraft,
                      )
                    }
                  />
                </label>

                <div className="plant-detail-edit-form__row">
                  <label>
                    Acquired date

                    <input
                      type="date"
                      value={
                        editDraft
                          .acquiredAt
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditDraft(
                          (
                            currentDraft,
                          ) =>
                            currentDraft
                              ? {
                                  ...currentDraft,

                                  acquiredAt:
                                    event
                                      .target
                                      .value,
                                }
                              : currentDraft,
                        )
                      }
                    />
                  </label>

                  <label>
                    Last watered

                    <input
                      type="date"
                      value={
                        editDraft
                          .lastWateredAt
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditDraft(
                          (
                            currentDraft,
                          ) =>
                            currentDraft
                              ? {
                                  ...currentDraft,

                                  lastWateredAt:
                                    event
                                      .target
                                      .value,
                                }
                              : currentDraft,
                        )
                      }
                    />
                  </label>
                </div>

                <label>
                  Next watering

                  <input
                    type="date"
                    value={
                      editDraft
                        .nextWateringAt
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                nextWateringAt:
                                  event
                                    .target
                                    .value,
                              }
                            : currentDraft,
                      )
                    }
                  />
                </label>

                <label>
                  Health notes

                  <textarea
                    value={
                      editDraft
                        .healthNotes
                    }
                    rows={5}
                    maxLength={3000}
                    placeholder="Add health notes or anything useful to remember..."
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                healthNotes:
                                  event
                                    .target
                                    .value,
                              }
                            : currentDraft,
                      )
                    }
                  />
                </label>

                <label className="plant-detail-edit-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      editDraft
                        .wateringRemindersEnabled
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                wateringRemindersEnabled:
                                  event
                                    .target
                                    .checked,
                              }
                            : currentDraft,
                      )
                    }
                  />

                  <span>
                    Enable watering
                    reminders
                  </span>
                </label>

                <label className="plant-detail-edit-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      editDraft
                        .notificationEnabled
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDraft(
                        (
                          currentDraft,
                        ) =>
                          currentDraft
                            ? {
                                ...currentDraft,

                                notificationEnabled:
                                  event
                                    .target
                                    .checked,
                              }
                            : currentDraft,
                      )
                    }
                  />

                  <span>
                    Enable watering
                    notifications
                  </span>
                </label>

                <div className="plant-detail-edit-form__row">
                  <label>
                    Reminder time

                    <input
                      type="time"
                      value={
                        editDraft
                          .reminderTime
                      }
                      required
                      onChange={(
                        event,
                      ) =>
                        setEditDraft(
                          (
                            currentDraft,
                          ) =>
                            currentDraft
                              ? {
                                  ...currentDraft,

                                  reminderTime:
                                    event
                                      .target
                                      .value,
                                }
                              : currentDraft,
                        )
                      }
                    />
                  </label>

                  <label>
                    Days before

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        editDraft
                          .reminderDaysBefore
                      }
                      required
                      onChange={(
                        event,
                      ) =>
                        setEditDraft(
                          (
                            currentDraft,
                          ) =>
                            currentDraft
                              ? {
                                  ...currentDraft,

                                  reminderDaysBefore:
                                    event
                                      .target
                                      .value,
                                }
                              : currentDraft,
                        )
                      }
                    />
                  </label>
                </div>

                <button
                  className="plant-detail-edit-form__save"
                  type="submit"
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? "Saving…"
                    : "Save changes"}
                </button>
              </form>
            ) : (
              <>
                <div className="plant-detail-title">
                  <p className="plant-detail-eyebrow">
                    {species
                      ?.commonName ||
                      "Your plant"}
                  </p>

                  <h1>
                    {plant.nickname}
                  </h1>

                  {species
                    ?.scientificName && (
                    <p className="plant-detail-scientific-name">
                      {
                        species.scientificName
                      }
                    </p>
                  )}
                </div>

                <dl className="plant-detail-facts">
                  <div>
                    <dt>
                      Health
                    </dt>

                    <dd>
                      {healthLabel(
                        plant.healthStatus,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Last watered
                    </dt>

                    <dd>
                      {formatDate(
                        plant.lastWateredAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Next watering
                    </dt>

                    <dd>
                      {formatDate(
                        plant.nextWateringAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Reminders
                    </dt>

                    <dd>
                      {remindersOn
                        ? `${
                            reminderSettings
                              ?.reminderTime ??
                            "09:00"
                          }, ${
                            reminderSettings
                              ?.reminderDaysBefore ??
                            0
                          } day(s) before`
                        : "Off"}
                    </dd>
                  </div>

                  {plant.location && (
                    <div>
                      <dt>
                        Location
                      </dt>

                      <dd>
                        {
                          plant.location
                        }
                      </dd>
                    </div>
                  )}

                  {plant.acquiredAt && (
                    <div>
                      <dt>
                        Acquired
                      </dt>

                      <dd>
                        {formatDate(
                          plant.acquiredAt,
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </>
            )}
          </div>
        </section>

        <section
          className="plant-detail-actions"
          aria-label="Plant actions"
        >
          <button
            type="button"
            onClick={() =>
              void handleWaterPlant()
            }
            disabled={
              watering ||
              editing
            }
          >
            <span aria-hidden="true">
              💧
            </span>

            <span>
              {watering
                ? "Saving…"
                : "Water plant"}
            </span>
          </button>

          <button
            type="button"
            onClick={
              handleJournalEntry
            }
            disabled={editing}
          >
            <span aria-hidden="true">
              📖
            </span>

            <span>
              Journal entry
            </span>
          </button>

          <button
            type="button"
            onClick={
              openPhotoPicker
            }
            disabled={
              uploadingPhoto ||
              editing
            }
          >
            <span aria-hidden="true">
              📷
            </span>

            <span>
              {uploadingPhoto
                ? "Uploading…"
                : "Add photo"}
            </span>
          </button>

          <input
            ref={photoInputRef}
            className="plant-detail-hidden-input"
            type="file"
            accept="image/*"
            onChange={(event) =>
              void handlePhotoSelected(
                event,
              )
            }
          />
        </section>

        {actionMessage && (
          <p
            className="plant-detail-message"
            role="status"
          >
            {actionMessage}
          </p>
        )}

        <PlantCareGuide
          species={getPlantSpecies(plant)}
        />

        <section className="plant-detail-timeline">
          <div className="plant-detail-section-heading">
            <div>
              <p className="plant-detail-eyebrow">
                History
              </p>

              <h2>
                Care timeline
              </h2>
            </div>

            <span>
              {careTimeline.length}
            </span>
          </div>

          {timelineError && (
            <p className="plant-detail-message">
              {timelineError}
            </p>
          )}

          {careTimeline.length >
          0 ? (
            <ol className="plant-detail-timeline__list">
              {careTimeline.map(
                (event) => (
                  <li
                    key={
                      event._id
                    }
                  >
                    <span
                      className="plant-detail-timeline__icon"
                      aria-hidden="true"
                    >
                      {getTimelineIcon(
                        event.type,
                      )}
                    </span>

                    <article>
                      <div>
                        <h3>
                          {
                            event.title
                          }
                        </h3>

                        <time
                          dateTime={
                            event.occurredAt
                          }
                        >
                          {formatTimelineDate(
                            event.occurredAt,
                          )}
                        </time>
                      </div>

                      {event.details && (
                        <p>
                          {
                            event.details
                          }
                        </p>
                      )}
                    </article>
                  </li>
                ),
              )}
            </ol>
          ) : (
            <div className="plant-detail-empty-timeline">
              <span aria-hidden="true">
                🌿
              </span>

              <h3>
                No care activity yet
              </h3>

              <p>
                Watering and journal
                entries for this plant
                will appear here.
              </p>
            </div>
          )}
        </section>

        {(plant.healthNotes ||
          plant.notes) &&
          !editing && (
            <section className="plant-detail-notes">
              <p className="plant-detail-eyebrow">
                Health notes
              </p>

              <h2>
                About{" "}
                {plant.nickname}
              </h2>

              <p>
                {plant.healthNotes ||
                  plant.notes}
              </p>
            </section>
          )}

        <section className="plant-detail-management">
          <button
            type="button"
            onClick={
              editing
                ? cancelEditing
                : startEditing
            }
          >
            {editing
              ? "Cancel editing"
              : "Edit plant"}
          </button>

          <button
            className="plant-detail-delete-button"
            type="button"
            onClick={() =>
              void handleDeletePlant()
            }
            disabled={
              deleting ||
              editing
            }
          >
            {deleting
              ? "Deleting…"
              : "Delete plant"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default PlantDetail;
