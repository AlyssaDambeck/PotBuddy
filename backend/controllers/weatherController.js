async function getWeather(req, res) {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    const parameters = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation",
      temperature_unit: "fahrenheit",
      timezone: "auto",
    });

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?${parameters.toString()}`
    );

    if (!weatherResponse.ok) {
      throw new Error("Weather provider request failed");
    }

    const weatherData = await weatherResponse.json();

    const temperature = weatherData.current.temperature_2m;
    const humidity = weatherData.current.relative_humidity_2m;
    const precipitation = weatherData.current.precipitation;

    let careMessage =
  "Conditions look normal. Follow your usual care schedule.";

if (temperature >= 85) {
    careMessage = "Consider your plant's water needs today.";
} else if (temperature <= 50) {
  careMessage =
    "Consider bringing more fragile plants inside today.";
} else if (humidity <= 35) {
  careMessage =
    "Humidity is low. Check plants that prefer humid conditions.";
} else if (precipitation > 0) {
  careMessage =
    "Rain is currently reported. Outdoor plants may not need watering.";
}

    return res.status(200).json({
      success: true,
      data: {
        location: "Orlando, Florida",
        temperature,
        apparentTemperature:
          weatherData.current.apparent_temperature,
        temperatureUnit:
          weatherData.current_units.temperature_2m,
        humidity,
        precipitation,
        careMessage,
      },
    });
  } catch (error) {
    console.error("Weather request error:", error);

    return res.status(502).json({
      success: false,
      message: "Unable to retrieve weather information",
    });
  }
}

module.exports = {
  getWeather,
};
