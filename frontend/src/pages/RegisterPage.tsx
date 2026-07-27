import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../styles/Auth.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

function RegisterPage() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [registerResult, setRegisterResult] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function doRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setRegisterResult("");

    if (password !== confirmPassword) {
        setRegisterResult("Passwords do not match.");
        return;
    }

    setIsLoading(true);

    try {
        const response = await fetch(`${apiBaseUrl}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                email,
                password,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Registration failed");
        }

        setRegisterResult(result.message);

        setTimeout(() => {
            navigate("/login");
        }, 2000);

    } catch (error) {

        if (error instanceof Error) {
            setRegisterResult(error.message);
        } else {
            setRegisterResult("Registration failed.");
        }

    } finally {
        setIsLoading(false);
    }
}
    
    return (
      <>
        <Navbar />
        
        <div className="auth-page">

            <div className="auth-card">

                <h1>Create Account</h1>

                <p className="auth-subtitle">
                    Start building your digital garden.
                </p>

                <form
                    className="auth-form"
                    onSubmit={doRegister}
                >

                   <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>

                </form>

                <div className="auth-footer">

                    Already have an account?{" "}

                    <Link to="/login">
                        Login
                    </Link>

                    {
                        registerResult && (
                            <p className="auth-error">
                                {registerResult}
                            </p>
                        )
                    }

                </div>

            </div>

        </div>
      </>
    );
}

export default RegisterPage;