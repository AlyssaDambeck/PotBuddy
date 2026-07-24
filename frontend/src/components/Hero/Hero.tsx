import { useNavigate } from "react-router-dom";
import Button from "../Button/Button";
import "./Hero.css";

function Hero() {

    const navigate = useNavigate();

    return (

        <section className="hero">

            <div className="hero__content">

                <p className="hero__eyebrow">
                    Plant Care • Journal • Reminders
                </p>

                <h1>
                    Grow together.
                </h1>

                <p className="hero__description">

                    Keep track of every plant,
                    every watering,
                    every new leaf,
                    and every milestone.

                </p>

                <Button

                    text="Get Started"

                    onClick={() => navigate("/login")}

                />

            </div>

        </section>

    );

}

export default Hero;