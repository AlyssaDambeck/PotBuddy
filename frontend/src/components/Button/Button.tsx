import "./Button.css";

interface ButtonProps {
    text: string;
    onClick?: () => void;
    type?: "button" | "submit";
}

function Button({
    text,
    onClick,
    type = "button"
}: ButtonProps) {

    return (
        <button
            className="button"
            onClick={onClick}
            type={type}
        >
            {text}
        </button>
    );
}

export default Button;