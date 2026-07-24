import { Link } from "react-router-dom";
import "./Navbar.css";
function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar__container">

                <div className="navbar__logo">
                    PotBuddy
                </div>

                <nav className="navbar__links">
                    <Link to="/">Home</Link>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                    <button className="navbar__button">
                        Get Started
                    </button>

                </nav>

            </div>
        </header>
    );
}

export default Navbar;
