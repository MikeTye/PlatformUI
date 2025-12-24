import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

const API = process.env.REACT_APP_API;

async function readJsonSafe(res) {
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : {}; } catch { return { raw: txt }; }
}

export default function ProfileGate() {
    const navigate = useNavigate();
    const [err, setErr] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await fetch(`${API}/users/me/profile`, {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                });

                if (!res.ok) {
                    const body = await readJsonSafe(res);
                    throw new Error(body?.error || "Failed to load profile");
                }

                const profile = await res.json();
                if (cancelled) return;

                if (!profile) navigate("/users/new", { replace: true });
                else navigate("/users/me/profile", { replace: true });
            } catch (e) {
                if (!cancelled) setErr(e?.message || "Failed to load profile");
            }
        })();

        return () => { cancelled = true; };
    }, [navigate]);

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3} display="flex" alignItems="center" gap={2}>
                        <CircularProgress size={18} />
                        <MDTypography variant="button" color="text">
                            Loading profile…
                        </MDTypography>
                    </MDBox>

                    {err ? (
                        <MDBox px={3} pb={3}>
                            <MDTypography variant="caption" color="error">
                                {err}
                            </MDTypography>
                        </MDBox>
                    ) : null}
                </Card>
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}