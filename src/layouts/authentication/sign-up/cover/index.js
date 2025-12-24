// react-router-dom components
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgImage from "assets/images/bg-sign-up-cover.jpeg";

const API = process.env.REACT_APP_API;

export default function Cover() {
  const nav = useNavigate();
  const [name, setName] = useState("");         // optional
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
      // after register, push user to sign-in
      nav("/authentication/sign-in/illustration", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoverLayout image={bgImage}>
      <Card>
        <MDBox variant="gradient" bgColor="info" borderRadius="lg" mx={2} mt={2} p={3} mb={1} textAlign="center">
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>Join us today</MDTypography>
          <MDTypography display="block" variant="button" color="white" my={1}>
            Enter your email and password to register
          </MDTypography>
        </MDBox>

        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={onSubmit}>
            <MDBox mb={2}>
              <MDInput type="text" label="Name (optional)" variant="standard" value={name} onChange={e=>setName(e.target.value)} fullWidth />
            </MDBox>
            <MDBox mb={2}>
              <MDInput type="email" label="Email" variant="standard" value={email} onChange={e=>setEmail(e.target.value)} required fullWidth />
            </MDBox>
            <MDBox mb={2}>
              <MDInput type="password" label="Password" variant="standard" value={password} onChange={e=>setPassword(e.target.value)} required fullWidth />
            </MDBox>

            <MDBox display="flex" alignItems="center" ml={-1}>
              <Checkbox checked={agree} onChange={e=>setAgree(e.target.checked)} />
              <MDTypography variant="button" color="text" sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}>
                &nbsp;&nbsp;I agree to the&nbsp;
              </MDTypography>
              <MDTypography component="a" href="#" variant="button" fontWeight="bold" color="info" textGradient>
                Terms and Conditions
              </MDTypography>
            </MDBox>

            {err && (
              <MDTypography variant="button" color="error" sx={{ mt: 2, display: "block" }}>
                {err}
              </MDTypography>
            )}

            <MDBox mt={4} mb={1}>
              <MDButton type="submit" variant="gradient" color="info" fullWidth disabled={loading}>
                {loading ? "Registering…" : "Sign up"}
              </MDButton>
            </MDBox>

            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Already have an account?{" "}
                <MDTypography component={Link} to="/authentication/sign-in/illustration" variant="button" color="info" fontWeight="medium" textGradient>
                  Sign In
                </MDTypography>
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </CoverLayout>
  );
}
