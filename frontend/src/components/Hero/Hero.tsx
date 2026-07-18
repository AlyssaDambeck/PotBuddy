import { useNavigate } from "react-router-dom";
import Button from "../Button/Button";
import "./Hero.css";

const navigate = useNavigate();

function Hero() {

    return (

        <section className="hero">

            <h1>Grow together.</h1>

            <p>
                Keep track of every plant,
                every watering,
                every new leaf,
                and every milestone.
            </p>

            <Button
                text="Get Started"
                onClick={() => navigate("/login")}
            />

        </section>

    );

}

export default Hero;