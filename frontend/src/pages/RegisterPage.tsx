import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../styles/Auth.css";

function RegisterPage() {
    return (
      <>
        <Navbar />
        
        <div className="auth-page">

            <div className="auth-card">

                <h1>Create Account</h1>

                <p className="auth-subtitle">
                    Start building your digital garden.
                </p>

                <form className="auth-form">

                    <input
                        type="text"
                        placeholder="First Name"
                    />

                    <input
                        type="text"
                        placeholder="Last Name"
                    />

                    <input
                        type="email"
                        placeholder="Email"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                    />

                    <button
                        type="submit"
                        className="auth-submit"
                    >
                        Create Account
                    </button>

                </form>

                <div className="auth-footer">

                    Already have an account?{" "}

                    <Link to="/login">
                        Login
                    </Link>

                </div>

            </div>

        </div>
      </>
    );
}

export default RegisterPage;