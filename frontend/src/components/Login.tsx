import { useState } from "react";
import type { FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

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
    <div id="loginDiv">
      <span id="inner-title">PLEASE LOG IN</span>

      <form onSubmit={doLogin}>
        <input
          type="email"
          id="loginEmail"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <br />

        <input
          type="password"
          id="loginPassword"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <br />

        <input
          type="submit"
          id="loginButton"
          className="buttons"
          value={loginButtonText}
          disabled={isLoading}
        />
      </form>

      <div>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => {
            setLoginResult("Google login was unsuccessful");
          }}
        />
      </div>

      <span id="loginResult">{loginResult}</span>
    </div>
  );
}

export default Login;
