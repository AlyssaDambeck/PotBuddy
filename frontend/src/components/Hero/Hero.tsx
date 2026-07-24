import { useNavigate } from "react-router-dom";
import Button from "../Button/Button";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">

      <div className="hero-content">

        <p className="hero-eyebrow">
          Welcome to PotBuddy
        </p>

        <h1>
          Grow together.
        </h1>

        <p className="hero-description">
          PotBuddy helps you keep every plant healthy with watering reminders,
          care guides, and a beautiful digital garden you'll actually enjoy
          coming back to.
        </p>

        <Button
          text="Get Started"
          onClick={() => navigate("/register")}
        />

      </div>

      <div className="hero-image">

        <div className="plant-placeholder">
          🌱
        </div>

      </div>

    </section>
  );
}
export default Hero;