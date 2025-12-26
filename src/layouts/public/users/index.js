import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import PublicLayout from "layouts/public/layout/index";

const API = process.env.REACT_APP_API;

async function readJsonSafe(res) {
    const txt = await res.text();
    try {
        return txt ? JSON.parse(txt) : {};
    } catch {
        return { raw: txt };
    }
}

function isNonEmpty(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.filter(Boolean).length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
}

function SectionCard({ title, icon, subtitle, children }) {
    return (
        <Card>
            <MDBox p={3}>
                <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    <MDBox display="flex" alignItems="center" gap={1.25}>
                        <Icon fontSize="small">{icon}</Icon>
                        <MDBox>
                            <MDTypography variant="h6">{title}</MDTypography>
                            {subtitle ? (
                                <MDTypography variant="button" color="text" sx={{ opacity: 0.8 }}>
                                    {subtitle}
                                </MDTypography>
                            ) : null}
                        </MDBox>
                    </MDBox>
                </MDBox>

                <Divider sx={{ my: 2 }} />
                {children}
            </MDBox>
        </Card>
    );
}

function KeyValue({ k, v }) {
    return (
        <MDBox
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={2}
            py={0.75}
        >
            <MDTypography variant="button" color="text" sx={{ opacity: 0.8, minWidth: 140 }}>
                {k}
            </MDTypography>
            <MDTypography variant="button" color="text" sx={{ textAlign: "right" }}>
                {v}
            </MDTypography>
        </MDBox>
    );
}

function EmptyHint({ text }) {
    return (
        <MDBox
            p={2}
            borderRadius={2}
            sx={(t) => ({
                border: `1px dashed ${t.palette.grey[300]}`,
                background: t.palette.background.default,
            })}
        >
            <MDBox display="flex" alignItems="center" gap={1}>
                <Icon fontSize="small">info</Icon>
                <MDTypography variant="button" color="text">
                    {text}
                </MDTypography>
            </MDBox>
        </MDBox>
    );
}

export default function PublicUserOverview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(undefined); // undefined=loading
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        (async () => {
            try {
                // Adjust to /public/users/${id} if your backend uses a public prefix
                const res = await fetch(`${API}/users/${id}`);
                if (!res.ok) {
                    const body = await readJsonSafe(res);
                    throw new Error(body?.error || "Profile not found");
                }
                const data = await res.json();
                if (cancelled) return;
                if (!data) {
                    throw new Error("Profile not found");
                }
                setProfile(data);
            } catch (e) {
                if (!cancelled) setErr(e?.message || "Profile not found");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const headerName = profile?.full_name || "User profile";
    const headerSubtitle =
        profile?.headline ||
        profile?.job_title ||
        "Profile information for this directory member.";

    return (
        <PublicLayout>
            <MDBox mt={10} mb={3}>
                {profile === undefined && !err ? (
                    <Card>
                        <MDBox p={3} display="flex" alignItems="center" gap={2}>
                            <CircularProgress size={18} />
                            <MDTypography variant="button" color="text">
                                Loading…
                            </MDTypography>
                        </MDBox>
                    </Card>
                ) : err ? (
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="caption" color="error">
                                {err}
                            </MDTypography>
                        </MDBox>
                    </Card>
                ) : (
                    <>
                        {/* Header */}
                        <Card>
                            <MDBox p={3}>
                                <MDBox
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    gap={2}
                                    flexWrap="wrap"
                                >
                                    <MDBox>
                                        <MDTypography variant="h4">{headerName}</MDTypography>
                                        <MDTypography variant="button" color="text" sx={{ opacity: 0.85 }}>
                                            {headerSubtitle}
                                        </MDTypography>

                                        <MDBox
                                            mt={2}
                                            display="flex"
                                            alignItems="center"
                                            gap={1.25}
                                            flexWrap="wrap"
                                        >
                                            {profile?.org_name && (
                                                <Chip
                                                    size="small"
                                                    label={profile.org_name}
                                                    icon={<Icon fontSize="small">business</Icon>}
                                                    variant="outlined"
                                                />
                                            )}

                                            {profile?.role_type && (
                                                <Chip
                                                    size="small"
                                                    label={profile.role_type}
                                                    icon={<Icon fontSize="small">badge</Icon>}
                                                    variant="outlined"
                                                />
                                            )}

                                            {[profile?.city, profile?.country].filter(Boolean).length > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={[profile.city, profile.country]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                    icon={<Icon fontSize="small">place</Icon>}
                                                    variant="outlined"
                                                />
                                            )}
                                        </MDBox>
                                    </MDBox>

                                    <MDBox display="flex" gap={1}>
                                        <MDButton
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => navigate(-1)}
                                            size="small"
                                        >
                                            Back
                                        </MDButton>
                                    </MDBox>
                                </MDBox>
                            </MDBox>
                        </Card>

                        {/* Content */}
                        <MDBox mt={3}>
                            <Grid container spacing={3} alignItems="flex-start">
                                {/* Left column */}
                                <Grid item xs={12} lg={6}>
                                    <MDBox display="flex" flexDirection="column" gap={3}>
                                        <SectionCard title="Contact" icon="call">
                                            <KeyValue
                                                k="Location"
                                                v={
                                                    [profile.city, profile.country]
                                                        .filter(Boolean)
                                                        .join(", ") || "—"
                                                }
                                            />
                                            <KeyValue k="Timezone" v={profile.timezone || "—"} />
                                            <Divider sx={{ my: 1.5 }} />
                                            <KeyValue k="Contact email" v={profile.contact_email || "—"} />
                                            <KeyValue k="Phone" v={profile.phone_number || "—"} />
                                        </SectionCard>

                                        <SectionCard title="Links" icon="link">
                                            <KeyValue k="LinkedIn" v={profile.linkedin_url || "—"} />
                                            <KeyValue k="Website" v={profile.personal_website || "—"} />
                                            <KeyValue k="Portfolio" v={profile.portfolio_url || "—"} />
                                        </SectionCard>
                                    </MDBox>
                                </Grid>

                                {/* Right column */}
                                <Grid item xs={12} lg={6}>
                                    <MDBox display="flex" flexDirection="column" gap={3}>
                                        <SectionCard title="About" icon="subject">
                                            {isNonEmpty(profile.bio) ? (
                                                <MDTypography
                                                    variant="button"
                                                    color="text"
                                                    sx={{ whiteSpace: "pre-wrap" }}
                                                >
                                                    {profile.bio}
                                                </MDTypography>
                                            ) : (
                                                <EmptyHint text="This user hasn't added a bio yet." />
                                            )}
                                        </SectionCard>

                                        <SectionCard title="Expertise & focus areas" icon="local_library">
                                            <MDTypography
                                                variant="button"
                                                color="text"
                                                sx={{ opacity: 0.8, display: "block", mb: 1 }}
                                            >
                                                Expertise
                                            </MDTypography>
                                            <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
                                                {isNonEmpty(profile.expertise_tags) ? (
                                                    profile.expertise_tags.map((x) => (
                                                        <Chip key={x} size="small" label={x} />
                                                    ))
                                                ) : (
                                                    <EmptyHint text="No expertise tags listed yet." />
                                                )}
                                            </MDBox>

                                            <MDTypography
                                                variant="button"
                                                color="text"
                                                sx={{ opacity: 0.8, display: "block", mb: 1 }}
                                            >
                                                Service offerings
                                            </MDTypography>
                                            <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
                                                {isNonEmpty(profile.service_offerings) ? (
                                                    profile.service_offerings.map((x) => (
                                                        <Chip key={x} size="small" label={x} variant="outlined" />
                                                    ))
                                                ) : (
                                                    <EmptyHint text="No services listed yet." />
                                                )}
                                            </MDBox>

                                            <MDTypography
                                                variant="button"
                                                color="text"
                                                sx={{ opacity: 0.8, display: "block", mb: 1 }}
                                            >
                                                Sectors
                                            </MDTypography>
                                            <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
                                                {isNonEmpty(profile.sectors) ? (
                                                    profile.sectors.map((x) => (
                                                        <Chip key={x} size="small" label={x} />
                                                    ))
                                                ) : (
                                                    <EmptyHint text="No sectors specified." />
                                                )}
                                            </MDBox>

                                            <MDTypography
                                                variant="button"
                                                color="text"
                                                sx={{ opacity: 0.8, display: "block", mb: 1 }}
                                            >
                                                Standards & methodologies
                                            </MDTypography>
                                            <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
                                                {isNonEmpty(profile.standards) ? (
                                                    profile.standards.map((x) => (
                                                        <Chip key={x} size="small" label={x} />
                                                    ))
                                                ) : (
                                                    <EmptyHint text="No standards specified." />
                                                )}
                                            </MDBox>

                                            <MDTypography
                                                variant="button"
                                                color="text"
                                                sx={{ opacity: 0.8, display: "block", mb: 1 }}
                                            >
                                                Languages
                                            </MDTypography>
                                            <MDBox display="flex" gap={1} flexWrap="wrap">
                                                {isNonEmpty(profile.languages) ? (
                                                    profile.languages.map((x) => (
                                                        <Chip key={x} size="small" label={x} />
                                                    ))
                                                ) : (
                                                    <EmptyHint text="No languages specified." />
                                                )}
                                            </MDBox>
                                        </SectionCard>
                                    </MDBox>
                                </Grid>
                            </Grid>
                        </MDBox>
                    </>
                )}
            </MDBox>
        </PublicLayout>
    );
}