import "./Navbar.css";
function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar__container">

                <div className="navbar__logo">
                    PotBuddy
                </div>

                <nav className="navbar__links">
                    <a href="#">Explore</a>
                    <a href="#">About</a>
                    <a href="#">Login</a>
                    <button className="navbar__button">
                        Get Started
                    </button>

                </nav>

            </div>
        </header>
    );
}

export default Navbar;