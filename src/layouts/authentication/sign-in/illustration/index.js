import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Switch from "@mui/material/Switch";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
import bgImage from "assets/images/illustrations/illustration-reset.jpg";

const API = process.env.REACT_APP_API;

export default function Illustration() {
    const nav = useNavigate();
    const [rememberMe, setRememberMe] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const r = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (!r.ok) throw new Error((await r.text()) || "Login failed");
            // If backend returns a token in JSON instead of cookie:
            const { token } = await r.json(); sessionStorage.setItem("token", token);

            const meRes = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!meRes.ok) throw new Error("Failed to load profile");

            const me = await meRes.json();
            // store in React context / state
            // store in sessionStorage instead of React state
            sessionStorage.setItem("user", JSON.stringify(me));

            // later you can read it with:
            // const user = JSON.parse(sessionStorage.getItem("user") || "null");

            nav("/dashboards/analytics", { replace: true });
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <IllustrationLayout
            title="Sign In"
            description="Enter your email and password to sign in"
            illustration={bgImage}
        >
            <MDBox component="form" role="form" onSubmit={onSubmit}>
                <MDBox mb={2}>
                    <MDInput type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required />
                </MDBox>
                <MDBox mb={2}>
                    <MDInput type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} fullWidth required />
                </MDBox>

                <MDBox display="flex" alignItems="center" ml={-1}>
                    <Switch checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                    <MDTypography variant="button" color="text" sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}>
                        &nbsp;&nbsp;Remember me
                    </MDTypography>
                </MDBox>

                {err && (
                    <MDTypography variant="button" color="error" sx={{ mt: 2, display: "block" }}>
                        {err}
                    </MDTypography>
                )}

                <MDBox mt={4} mb={1}>
                    <MDButton type="submit" variant="gradient" color="info" size="large" fullWidth disabled={loading}>
                        {loading ? "Signing in…" : "Sign in"}
                    </MDButton>
                </MDBox>

                {/* Forgot password link */}
                <MDBox mt={1} mb={3} textAlign="center">
                    <MDTypography component={Link} to="/authentication/reset-password/cover" variant="button" color="info" fontWeight="medium" textGradient>
                        Forgot password?
                    </MDTypography>
                </MDBox>

                <MDBox textAlign="center">
                    <MDTypography variant="button" color="text">
                        Don&apos;t have an account?{" "}
                        <MDTypography component={Link} to="/authentication/sign-up/illustration" variant="button" color="info" fontWeight="medium" textGradient>
                            Sign up
                        </MDTypography>
                    </MDTypography>
                </MDBox>
            </MDBox>
        </IllustrationLayout>
    );
}