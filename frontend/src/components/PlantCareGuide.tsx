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

      {species.sunlight && (
        <div className="care-card">
          <h3>☀️ Sunlight</h3>

          <span className="care-badge">
            {species.sunlight.level}
          </span>

          <p>{species.sunlight.instructions}</p>
        </div>
      )}

      {species.watering && (
        <div className="care-card">
          <h3>💧 Watering</h3>

          <span className="care-badge">
            Every {species.watering.intervalDays} days
          </span>

          <p>{species.watering.instructions}</p>

          {species.watering.warningSigns &&
            species.watering.warningSigns.length > 0 && (
              <>
                <h4>Warning Signs</h4>

                <ul>
                  {species.watering.warningSigns.map((sign) => (
                    <li key={sign}>{sign}</li>
                  ))}
                </ul>
              </>
          )}
        </div>
      )}

      {species.humidity && (
        <div className="care-card">
          <h3>💨 Humidity</h3>

          <span className="care-badge">
            {species.humidity.level}
          </span>

          <p>{species.humidity.instructions}</p>
        </div>
      )}

      {species.temperature && (
        <div className="care-card">
          <h3>🌡 Temperature</h3>

          <span className="care-badge">
            {species.temperature.minimum}°
            {" - "}
            {species.temperature.maximum}°
            {species.temperature.unit}
          </span>
        </div>
      )}

      {species.soil && (
        <div className="care-card">
            <h3>🌱 Soil</h3>

            <p>{species.soil}</p>
        </div>
      )}

      {species.fertilizing && (
        <div className="care-card">
            <h3>🌼 Fertilizer</h3>

            {species.fertilizing.intervalDays && (
                <span className="care-badge">
                    Every {species.fertilizing.intervalDays} days
                </span>
            )}

            {species.fertilizing.instructions && (
                <p>{species.fertilizing.instructions}</p>
            )}
            </div>
       )}

       {species.toxicity && (
  <div className="care-card">
    <h3>🐾 Pet Safety</h3>

    <span
      className={
        species.toxicity.toxicToPets
          ? "care-badge danger"
          : "care-badge safe"
      }
    >
      {species.toxicity.toxicToPets
        ? "Toxic to Pets"
        : "Pet Friendly"}
    </span>

    {species.toxicity.notes && (
      <p>{species.toxicity.notes}</p>
    )}
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