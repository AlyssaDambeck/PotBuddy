import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function EmailVerifiedPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const status = searchParams.get("status");

    useEffect(() => {
        if (status !== "invalid" && status !== "error") {
            const timer = setTimeout(() => {
                navigate("/login");
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [navigate, status]);

    if (status === "invalid") {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <h1>❌ Invalid Link</h1>
                    <p>This verification link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <h1>⚠️ Verification Failed</h1>
                    <p>Please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>🌱 Email Verified!</h1>
                <p>Your account has been verified successfully.</p>
                <p>Redirecting you to login...</p>
            </div>
        </div>
    );
}