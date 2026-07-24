import type { ReactNode } from "react";
import "./Section.css";

interface SectionProps {
    children: ReactNode;
    className?: string;
}

function Section({
    children,
    className = ""
}: SectionProps) {

    return (
        <section className={`section ${className}`}>
            {children}
        </section>
    );

}

export default Section;