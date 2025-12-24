// src/layouts/authentication/sign-up/cover/index.js
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// @mui material components
import Checkbox from "@mui/material/Checkbox";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";

// You can reuse the same illustration as sign-in or keep your own
import bgImage from "assets/images/illustrations/sign_up.jpg";

const API = process.env.REACT_APP_API;

export default function SignUpIllustration() {
  const nav = useNavigate();
  const [name, setName] = useState(""); // optional
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!agree) return setErr("Please accept the Terms.");
    setErr("");
    setLoading(true);
    try {
      const payload = { email, password };
      if (name.trim()) payload.name = name.trim(); // only send if provided

      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error((await r.text()) || "Registration failed");

      // After successful register, go to sign-in illustration
      nav("/authentication/sign-in/illustration", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IllustrationLayout
      title="Sign Up"
      description="Enter your details to create an account"
      illustration={bgImage}
    >
      <MDBox component="form" role="form" onSubmit={onSubmit}>
        <MDBox mb={2}>
          <MDInput
            type="text"
            label="Name (optional)"
            variant="standard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </MDBox>

        <MDBox mb={2}>
          <MDInput
            type="email"
            label="Email"
            variant="standard"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
        </MDBox>

        <MDBox mb={2}>
          <MDInput
            type="password"
            label="Password"
            variant="standard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
        </MDBox>

        <MDBox display="flex" alignItems="center" ml={-1} mb={1}>
          <Checkbox
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <MDTypography
            variant="button"
            color="text"
            sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
          >
            &nbsp;&nbsp;I agree to the&nbsp;
          </MDTypography>
          <MDTypography
            component="a"
            href="#"
            variant="button"
            fontWeight="bold"
            color="info"
            textGradient
          >
            Terms and Conditions
          </MDTypography>
        </MDBox>

        {err && (
          <MDTypography
            variant="button"
            color="error"
            sx={{ mt: 1, mb: 1, display: "block" }}
          >
            {err}
          </MDTypography>
        )}

        <MDBox mt={3} mb={1}>
          <MDButton
            type="submit"
            variant="gradient"
            color="info"
            size="large"
            fullWidth
            disabled={loading}
          >
            {loading ? "Registering…" : "Sign up"}
          </MDButton>
        </MDBox>

        <MDBox mt={3} textAlign="center">
          <MDTypography variant="button" color="text">
            Already have an account?{" "}
            <MDTypography
              component={Link}
              to="/authentication/sign-in/illustration"
              variant="button"
              color="info"
              fontWeight="medium"
              textGradient
            >
              Sign in
            </MDTypography>
          </MDTypography>
        </MDBox>
      </MDBox>
    </IllustrationLayout>
  );
}