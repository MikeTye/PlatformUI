import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import UserProfileOverview from "../../users/components/userProfileOverview";

import PublicLayout from "layouts/public/layout/index";

const API = process.env.REACT_APP_API;

async function readJsonSafe(res) {
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : {}; } catch { return { raw: txt }; }
}

export default function PublicUserOverview() {
    const { id } = useParams();
    const [profile, setProfile] = useState(undefined);
    const [err, setErr] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`${API}/users/${id}`);
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
    }, [id]);

    return (
        <PublicLayout>
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
        </PublicLayout>
    );
}