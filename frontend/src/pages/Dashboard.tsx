import { useState } from "react";
import "./Dashboard.css";

const mockPlants = [
  {
    id: "1",
    nickname: "Snakey",
    species: "Snake Plant",
    emoji: "🪴",
    health: "Healthy",
    waterInDays: 3,
  },
  {
    id: "2",
    nickname: "Monty",
    species: "Monstera",
    emoji: "🌿",
    health: "Healthy",
    waterInDays: 0,
  },
  {
    id: "3",
    nickname: "Lily",
    species: "Peace Lily",
    emoji: "🌱",
    health: "Needs attention",
    waterInDays: -2,
  },
];

function getWateringText(days: number) {
  if (days < 0) {
    const overdueDays = Math.abs(days);

    return `Overdue by ${overdueDays} ${
      overdueDays === 1 ? "day" : "days"
    }`;
  }

  if (days === 0) {
    return "Water today";
  }

  if (days === 1) {
    return "Water tomorrow";
  }

  return `Water in ${days} days`;
}

function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [plants] = useState(mockPlants);

  const plantsNeedingCare = plants.filter(
    (plant) => plant.waterInDays <= 0
  );

  const handleNavigation = (destination: string) => {
    console.log(`Navigate to: ${destination}`);
    setMenuOpen(false);

    /*
     * Replace this with React Router later:
     *
     * navigate(destination);
     */
  };

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
            onClick={() => handleNavigation("/dashboard")}
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
            onClick={() => handleNavigation("/garden")}
          >
            <span aria-hidden="true">🌿</span>
            Garden
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
            onClick={() => handleNavigation("/dashboard")}
          >
            <span aria-hidden="true">🌱</span>
            <span>Pot Buddy</span>
          </button>

          <div className="top-navigation__actions">
            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Open notifications"
              onClick={() => handleNavigation("/notifications")}
            >
              <span aria-hidden="true">🔔</span>

              {plantsNeedingCare.length > 0 && (
                <span
                  className="notification-badge"
                  aria-label={`${plantsNeedingCare.length} notifications`}
                >
                  {plantsNeedingCare.length}
                </span>
              )}
            </button>

            <button
              className="profile-button"
              type="button"
              aria-label="Open profile"
              onClick={() => handleNavigation("/profile")}
            >
              <span aria-hidden="true">🪴</span>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome-section">
            <p className="eyebrow">Your dashboard</p>
            <h1>Welcome to your garden</h1>
            <p>
              Keep an eye on your plants and see what needs care
              today.
            </p>
          </section>

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
                {plants.map((plant, index) => (
                  <button
                    key={plant.id}
                    type="button"
                    className={`garden-plant garden-plant--${
                      index + 1
                    }`}
                    aria-label={`Open ${plant.nickname}, ${plant.species}`}
                    onClick={() =>
                      handleNavigation(`/plants/${plant.id}`)
                    }
                  >
                    <span className="garden-plant__emoji">
                      {plant.emoji}
                    </span>

                    <span className="garden-plant__name">
                      {plant.nickname}
                    </span>
                  </button>
                ))}
              </div>

              <div className="garden-ground" aria-hidden="true" />
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => handleNavigation("/garden")}
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

              <span className="task-count">
                {plantsNeedingCare.length}
              </span>
            </div>

            {plantsNeedingCare.length > 0 ? (
              <div className="care-list">
                {plantsNeedingCare.map((plant) => (
                  <article className="care-card" key={plant.id}>
                    <button
                      className="care-card__plant"
                      type="button"
                      onClick={() =>
                        handleNavigation(`/plants/${plant.id}`)
                      }
                    >
                      <span
                        className="care-card__image"
                        aria-hidden="true"
                      >
                        {plant.emoji}
                      </span>

                      <span className="care-card__information">
                        <strong>{plant.nickname}</strong>
                        <span>{plant.species}</span>

                        <span
                          className={`health-status ${
                            plant.health === "Healthy"
                              ? "health-status--healthy"
                              : "health-status--warning"
                          }`}
                        >
                          {plant.health}
                        </span>
                      </span>
                    </button>

                    <div className="care-card__action">
                      <span className="watering-label">
                        <span aria-hidden="true">💧</span>
                        {getWateringText(plant.waterInDays)}
                      </span>

                      <button
                        className="water-button"
                        type="button"
                        onClick={() =>
                          console.log(`Watered ${plant.nickname}`)
                        }
                      >
                        Mark watered
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
              {plants.map((plant) => (
                <button
                  className="plant-summary-card"
                  type="button"
                  key={plant.id}
                  onClick={() =>
                    handleNavigation(`/plants/${plant.id}`)
                  }
                >
                  <span
                    className="plant-summary-card__image"
                    aria-hidden="true"
                  >
                    {plant.emoji}
                  </span>

                  <span className="plant-summary-card__details">
                    <strong>{plant.nickname}</strong>
                    <span>{plant.species}</span>
                    <small>
                      {getWateringText(plant.waterInDays)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </main>

        <nav className="quick-action-navigation">
          <button
            type="button"
            onClick={() => handleNavigation("/plants/add")}
          >
            <span className="quick-action-navigation__icon">＋</span>
            <span>Add plant</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation("/care/log")}
          >
            <span className="quick-action-navigation__icon">💧</span>
            <span>Log care</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigation("/photos/add")}
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
    </div>
  );
}

export default Dashboard;
