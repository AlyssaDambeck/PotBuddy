const request = require("supertest");

jest.mock("../config/db", () => ({
  client: {
    db: jest.fn(() => ({
      collection: jest.fn(),
    })),
  },
}));

const app = require("../app");

function createWeatherResponse(temperature, humidity, precipitation = 0) {
  return {
    current: {
      temperature_2m: temperature,
      apparent_temperature: temperature,
      relative_humidity_2m: humidity,
      precipitation,
    },
    current_units: {
      temperature_2m: "°F",
    },
  };
}

describe("Weather API", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("rejects requests without coordinates", async () => {
    const response = await request(app).get("/api/weather");

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Latitude and longitude are required"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects coordinates outside valid ranges", async () => {
    const response = await request(app)
      .get("/api/weather")
      .query({
        latitude: 100,
        longitude: -200,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid latitude or longitude"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("returns hot-weather plant advice", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createWeatherResponse(92, 60),
    });

    const response = await request(app)
      .get("/api/weather")
      .query({
        latitude: 28.5383,
        longitude: -81.3792,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.location).toBe("Orlando, Florida");
    expect(response.body.data.temperature).toBe(92);
    expect(response.body.data.careMessage).toBe(
      "Consider your plant's water needs today."
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("returns cold-weather plant advice", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createWeatherResponse(42, 55),
    });

    const response = await request(app)
      .get("/api/weather")
      .query({
        latitude: 28.5383,
        longitude: -81.3792,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.careMessage).toBe(
      "Consider bringing more fragile plants inside today."
    );
  });

  test("handles a failure from the weather provider", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
    });

    const response = await request(app)
      .get("/api/weather")
      .query({
        latitude: 28.5383,
        longitude: -81.3792,
      });

    expect(response.statusCode).toBe(502);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Unable to retrieve weather information"
    );
  });
});
