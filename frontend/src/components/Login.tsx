import type { CredentialResponse } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginResult, setLoginResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function saveAuthentication(data: {
    token: string;
    user: unknown;
  }) {
    localStorage.setItem("potbuddyToken", data.token);
    localStorage.setItem("potbuddyUser", JSON.stringify(data.user));
  }

  async function doLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setLoginResult("");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      saveAuthentication(result.data);
      navigate("/garden");
    } catch (error) {
      if (error instanceof Error) {
        setLoginResult(error.message);
      } else {
        setLoginResult("Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSuccess(
    credentialResponse: CredentialResponse
  ) {
    setLoginResult("");

    if (!credentialResponse.credential) {
      setLoginResult("Google did not return a credential");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Google login failed");
      }

      saveAuthentication(result.data);
      navigate("/garden");
    } catch (error) {
      if (error instanceof Error) {
        setLoginResult(error.message);
      } else {
        setLoginResult("Google login failed");
      }
    }
  }

  let loginButtonText = "Log In";

  if (isLoading) {
    loginButtonText = "Logging in...";
  }

  return (

    <div className="auth-page">
    <div className="auth-card">

    <div className="auth-logo">
      PotBuddy
    </div>

    <h1>
      Welcome Back
    </h1>

    <p className="auth-subtitle">
      Sign in to continue caring for your plants.
    </p>

    <form
      className="auth-form"
      onSubmit={doLogin}
    >

    <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(event)=>setEmail(event.target.value)}
      required
    />

    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(event)=>setPassword(event.target.value)}
      required
    />

    <button
      className="auth-submit"
      type="submit"
      disabled={isLoading}
    >

    {loginButtonText}

    </button>

    </form>

    <div className="auth-divider">

      or

    </div>

    <div className="auth-google">

    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={()=>{
      setLoginResult("Google login was unsuccessful");
      }}
    />

    </div>

    <div className="auth-footer">

      Don't have an account?

      {" "}

      <Link to="/register">

        Create one

      </Link>

    </div>
    {

      loginResult && (

      <p className="auth-error">

      {loginResult}

      </p>

      )

    }

    </div>

    </div>

  );
}

export default Login;
