<div className="care-list">

  <div className="care-row">
    <span>☀️ Sunlight</span>
    <span>{species.sunlight?.instructions}</span>
  </div>

  <div className="care-row">
    <span>💧 Watering</span>
    <span>{species.watering?.instructions}</span>
  </div>

  <div className="care-row">
    <span>💨 Humidity</span>
    <span>{species.humidity?.instructions}</span>
  </div>

  <div className="care-row">
    <span>🌡 Temperature</span>
    <span>
      {species.temperature?.minimum}
      {"–"}
      {species.temperature?.maximum}
      {species.temperature?.unit}
    </span>
  </div>

  <div className="care-row">
    <span>🌱 Soil</span>
    <span>{species.soil}</span>
  </div>

  <div className="care-row">
    <span>🌼 Fertilizer</span>
    <span>{species.fertilizing?.instructions}</span>
  </div>

  <div className="care-row">
    <span>🐾 Pet Safety</span>

    <span>
      {species.toxicity?.toxicToPets
        ? "Toxic to pets"
        : "Pet friendly"}
    </span>
  </div>

</div>