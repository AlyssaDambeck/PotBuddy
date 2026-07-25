import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {

    const location = useLocation();
    return (
        <header className="navbar">

            <Link to="/" className="logo">
                PotBuddy
            </Link>

            <nav>

                {location.pathname === "/" && (

                    <>

                        <Link to="/login">

                            Login

                        </Link>

                        <Link
                            to="/register"
                            className="signup-link"
                        >

                            Sign Up

                        </Link>

                    </>

                )}

                {location.pathname === "/login" && (

                    <>

                        <Link to="/">

                            Home

                        </Link>

                        <Link
                            to="/register"
                            className="signup-link"
                        >

                            Sign Up

                        </Link>

                    </>

                )}

                {location.pathname === "/register" && (

                    <>

                        <Link to="/">

                            Home

                        </Link>

                        <Link to="/login">

                            Login

                        </Link>

                    </>

                )}

            </nav>

        </header>

    );

}

export default Navbar;