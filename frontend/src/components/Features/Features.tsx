import FeatureCard from "../FeatureCard/FeatureCard";
import Section from "../Section/Section";
import "./Features.css";

function Features() {
    return (
        <Section>

            <div className="features-header">

                <p>Everything you need</p>

                <h2>
                    Caring for plants should
                    <br />
                    feel effortless.
                </h2>

            </div>

            <div className="features-grid">

                <FeatureCard
                    icon="🌿"
                    title="Plant Care"
                    description="Store care information for every plant in one organized place."
                />

                <FeatureCard
                    icon="💧"
                    title="Water Reminders"
                    description="Never forget to water your plants with personalized schedules."
                />

                <FeatureCard
                    icon="📖"
                    title="Garden Journal"
                    description="Track growth, notes, and memorable milestones throughout each season."
                />

            </div>

        </Section>
    );
}

export default Features;