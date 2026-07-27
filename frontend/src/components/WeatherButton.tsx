import { useState } from "react";
import "./WeatherButton.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

interface WeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  humidity: number;
  careMessage: string;
}

function WeatherButton() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function requestWeather(latitude: number, longitude: number) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });

    const response = await fetch(
      `${apiBaseUrl}/weather?${params.toString()}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load weather");
    }

    setWeather(result.data);
  }

  function loadWeather() {
    setIsLoading(true);
    setMessage("");
    setWeather(null);

    if (!navigator.geolocation) {
      setMessage("Location services are not supported by this browser.");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await requestWeather(
            position.coords.latitude,
            position.coords.longitude
          );
        } catch (error) {
          if (error instanceof Error) {
            setMessage(error.message);
          } else {
            setMessage("Unable to load weather");
          }
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        setMessage(
          "Location access was denied. Enable it to check local plant weather."
        );
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  let buttonText = "Check Weather";

  if (isLoading) {
    buttonText = "Checking Weather...";
  }

  return (
    <section className="weather-card">
      <div className="weather-card__header">
        <div>
          <p className="eyebrow">Local conditions</p>
          <h2>Garden Weather</h2>
        </div>

        <button
          className="weather-card__button"
          type="button"
          onClick={loadWeather}
          disabled={isLoading}
        >
          {buttonText}
        </button>
      </div>

      {weather && (
        <div className="weather-card__details">
          <div className="weather-card__stat">
            <span>Location</span>
            <strong>{weather.location}</strong>
          </div>

          <div className="weather-card__stat">
            <span>Temperature</span>
            <strong>
              {weather.temperature}
              {weather.temperatureUnit}
            </strong>
          </div>

          <div className="weather-card__stat">
            <span>Humidity</span>
            <strong>{weather.humidity}%</strong>
          </div>

          <p className="weather-card__message">
            {weather.careMessage}
          </p>
        </div>
      )}

      {message && (
        <p className="weather-card__error">{message}</p>
      )}
    </section>
  );
}

export default WeatherButton;
