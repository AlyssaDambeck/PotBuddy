import Features from "../../components/Features/Features";
import Hero from "../../components/Hero/Hero";
import Navbar from "../../components/Navbar/Navbar";
import "./Landing.css";

function Landing() {
    return (
        <>
            <Navbar />

            <main className="landing-page">
                <Hero />
                <Features />
            </main>
        </>
    );
}

export default Landing;