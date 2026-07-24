import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {

    return (

        <header className="navbar">

            <Link to="/" className="logo">
                PotBuddy
            </Link>

            <nav>

                <Link to="/login">
                    Login
                </Link>

                <Link to="/register" className="signup-link">
                    Sign Up
                </Link>

            </nav>

        </header>

    );

}

export default Navbar;