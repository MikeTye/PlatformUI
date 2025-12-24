import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import UserProfileOverview from "../components/userProfileOverview";

const API = process.env.REACT_APP_API;

async function readJsonSafe(res) {
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : {}; } catch { return { raw: txt }; }
}

export default function PublicProfileOverview() {
    const { userId } = useParams();
    const [profile, setProfile] = useState(undefined);
    const [err, setErr] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`${API}/users/${userId}`);
                if (!res.ok) {
                    const body = await readJsonSafe(res);
                    throw new Error(body?.error || "Profile not found");
                }
                const data = await res.json();
                if (!cancelled) setProfile(data);
            } catch (e) {
                if (!cancelled) setErr(e?.message || "Profile not found");
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                {profile === undefined && !err ? (
                    <Card>
                        <MDBox p={3} display="flex" alignItems="center" gap={2}>
                            <CircularProgress size={18} />
                            <MDTypography variant="button" color="text">Loading…</MDTypography>
                        </MDBox>
                    </Card>
                ) : err ? (
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="caption" color="error">{err}</MDTypography>
                        </MDBox>
                    </Card>
                ) : (
                    <UserProfileOverview profile={profile} isOwner={false} />
                )}
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}