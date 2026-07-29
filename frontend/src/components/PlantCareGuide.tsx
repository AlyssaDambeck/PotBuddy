import "./PlantCareGuide.css";

type Disease = {
  name: string;
  symptoms: string[];
  cause: string;
  treatment: string[];
};

type PlantSpecies = {
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

type Props = {
  species?: PlantSpecies | null;
};

export default function PlantCareGuide({
  species,
}: Props) {
  if (!species) return null;

  return (

  <section className="care-guide">
    <h2>🌿 Care Guide</h2>

    <div className="care-grid">

      <div className="care-card care-card-full">
  <h3>🌿 Care Overview</h3>

  <div className="care-list">

    {species.sunlight && (
      <div className="care-row">
        <strong>☀️ Sunlight</strong>
        <span>{species.sunlight.instructions}</span>
      </div>
    )}

    {species.watering && (
      <div className="care-row">
        <strong>💧 Watering</strong>
        <span>
          Every {species.watering.intervalDays} days
        </span>
      </div>
    )}

    {species.humidity && (
      <div className="care-row">
        <strong>💨 Humidity</strong>
        <span>{species.humidity.instructions}</span>
      </div>
    )}

    {species.temperature && (
      <div className="care-row">
        <strong>🌡 Temperature</strong>
        <span>
          {species.temperature.minimum}°–
          {species.temperature.maximum}°
          {species.temperature.unit}
        </span>
      </div>
    )}

    {species.soil && (
      <div className="care-row">
        <strong>🌱 Soil</strong>
        <span>{species.soil}</span>
      </div>
    )}

    {species.fertilizing && (
      <div className="care-row">
        <strong>🌼 Fertilizer</strong>
        <span>{species.fertilizing.instructions}</span>
      </div>
    )}

    {species.toxicity && (
      <div className="care-row">
        <strong>🐾 Pet Safety</strong>

        <span>
          {species.toxicity.toxicToPets
            ? "Toxic to pets"
            : "Pet friendly"}
        </span>
      </div>
    )}

  </div>
</div>
  </div>
)}

{species.additionalCareNotes &&
  species.additionalCareNotes.length > 0 && (
    <div className="care-card">
      <h3>💡 Extra Care Tips</h3>

      <ul>
        {species.additionalCareNotes.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      {species.commonDiseases &&
  species.commonDiseases.length > 0 && (
    <div className="care-card care-card-full">
      <h3>🦠 Common Diseases</h3>

      {species.commonDiseases.map((disease) => (
        <details
          key={disease.name}
          className="disease-item"
        >
          <summary>{disease.name}</summary>

          <div className="disease-content">

            <h4>Symptoms</h4>

            <ul>
              {disease.symptoms.map((symptom) => (
                <li key={symptom}>{symptom}</li>
              ))}
            </ul>

            <h4>Cause</h4>

            <p>{disease.cause}</p>

            <h4>Treatment</h4>

            <ul>
              {disease.treatment.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>

          </div>

        </details>
      ))}
    </div>
)}

    </div>
)}

    </div>
  </section>

  );
}