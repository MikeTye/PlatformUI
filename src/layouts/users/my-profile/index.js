import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import UserProfileOverview from "../components/userProfileOverview";

const API = process.env.REACT_APP_API;

async function readJsonSafe(res) {
    const txt = await res.text();
    try {
        return txt ? JSON.parse(txt) : {};
    } catch {
        return { raw: txt };
    }
}

function openPublicProfile(userId) {
    if (!userId) return;

    const { origin, pathname } = window.location;

    // supports:
    // - /#/public/users/:id
    // - /public/users/:id (if you later switch routers)
    const base = pathname.includes("/#/")
        ? `${origin}${pathname.split("#")[0]}#/`
        : `${origin}/#/`;

    window.open(
        `${base}public/users/${userId}`,
        "_blank",
        "noopener,noreferrer"
    );
}

function isNonEmpty(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.filter(Boolean).length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
}

function SectionCard({ title, icon, subtitle, children, action }) {
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
                    {action ? <MDBox>{action}</MDBox> : null}
                </MDBox>

                <Divider sx={{ my: 2 }} />

                {children}
            </MDBox>
        </Card>
    );
}

function KeyValue({ k, v }) {
    return (
        <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} py={0.75}>
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

export default function MyProfileOverview() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(undefined); // undefined=loading, null=none
    const [err, setErr] = useState(null);

    const token = useMemo(() => sessionStorage.getItem("token"), []);
    const authHeaders = useMemo(
        () => ({
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`${API}/users/me/profile`, { headers: authHeaders });
                if (!res.ok) {
                    const body = await readJsonSafe(res);
                    throw new Error(body?.error || "Failed to load profile");
                }
                const data = await res.json();
                if (cancelled) return;

                if (!data) {
                    setProfile(null);
                    navigate("/profile/create", { replace: true });
                    return;
                }
                setProfile(data);
            } catch (e) {
                if (!cancelled) setErr(e?.message || "Failed to load profile");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authHeaders, navigate]);

    const completion = useMemo(() => {
        if (!profile) return { pct: 0, filled: 0, total: 0, missing: [] };

        const checks = [
            ["Full name", profile.full_name],
            ["Headline", profile.headline],
            ["Job title", profile.job_title],
            ["Country", profile.country],
            ["City", profile.city],
            ["Role type", profile.role_type],
            ["Bio", profile.bio],
            ["Expertise tags", profile.expertise_tags],
            ["Service offerings", profile.service_offerings],
            ["Sectors", profile.sectors],
            ["Standards", profile.standards],
            ["Languages", profile.languages],
            ["LinkedIn", profile.linkedin_url],
            ["Website", profile.personal_website],
            ["Contact email", profile.contact_email],
        ];

        const missing = checks.filter(([, v]) => !isNonEmpty(v)).map(([k]) => k);
        const filled = checks.length - missing.length;
        const total = checks.length;
        const pct = total ? Math.round((filled / total) * 100) : 0;

        return { pct, filled, total, missing };
    }, [profile]);

    const headerName = profile?.full_name || "My Profile";
    const headerSubtitle = profile?.headline || profile?.job_title || "Complete your profile to increase trust and discoverability.";
    const isPublic = !!profile?.is_public;

    const onEdit = () => navigate("/users/me/edit");

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                {profile === undefined ? (
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
                ) : profile ? (
                    <>
                        {/* Header */}
                        <Card>
                            <MDBox p={3}>
                                <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
                                    <MDBox>
                                        <MDTypography variant="h4">{headerName}</MDTypography>
                                        <MDTypography variant="button" color="text" sx={{ opacity: 0.85 }}>
                                            {headerSubtitle}
                                        </MDTypography>

                                        <MDBox mt={2} display="flex" alignItems="center" gap={1.25} flexWrap="wrap">
                                            {/* <Chip
                                                size="small"
                                                label={isPublic ? "Public" : "Private"}
                                                icon={<Icon fontSize="small">{isPublic ? "public" : "lock"}</Icon>}
                                            /> */}
                                            <Chip
                                                size="small"
                                                label={`${completion.pct}% complete`}
                                                icon={<Icon fontSize="small">check_circle</Icon>}
                                                variant="outlined"
                                            />
                                            {profile?.org_name ? (
                                                <Chip
                                                    size="small"
                                                    label={profile.org_name}
                                                    icon={<Icon fontSize="small">business</Icon>}
                                                    variant="outlined"
                                                />
                                            ) : null}
                                        </MDBox>
                                    </MDBox>

                                    <MDBox display="flex" alignItems="center" gap={1}>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            sx={{
                                                color: "#000000ff",
                                                fontWeight: 600,
                                            }}
                                            onClick={onEdit}
                                            startIcon={<Icon>edit</Icon>}
                                        >
                                            Edit profile
                                        </Button>

                                        <Button
                                            variant="contained"
                                            color="info"
                                            sx={{
                                                color: "#000000ff",
                                                fontWeight: 600,
                                            }}
                                            onClick={() => openPublicProfile(profile?.user_id)}
                                            startIcon={<Icon>visibility</Icon>}
                                        >
                                            View public
                                        </Button>
                                    </MDBox>
                                </MDBox>

                                <MDBox mt={2}>
                                    <LinearProgress variant="determinate" value={completion.pct} />
                                    {completion.missing.length ? (
                                        <MDBox mt={1} display="flex" gap={1} flexWrap="wrap">
                                            {completion.missing.slice(0, 6).map((m) => (
                                                <Chip key={m} size="small" label={`Add: ${m}`} variant="outlined" />
                                            ))}
                                            {completion.missing.length > 6 ? (
                                                <Chip size="small" label={`+${completion.missing.length - 6} more`} variant="outlined" />
                                            ) : null}
                                        </MDBox>
                                    ) : (
                                        <MDBox mt={1}>
                                            <MDTypography variant="button" color="text" sx={{ opacity: 0.8 }}>
                                                Nice — your profile looks complete.
                                            </MDTypography>
                                        </MDBox>
                                    )}
                                </MDBox>
                            </MDBox>
                        </Card>

                        <MDBox mt={3}>
                            <Grid container spacing={3}>
                                {/* Left: Directory Preview */}
                                <Grid item xs={12} lg={7}>
                                    <SectionCard
                                        title="Directory preview"
                                        icon="badge"
                                        subtitle="This is how your profile appears in the directory."
                                    // action={
                                    //     <Button variant="text" onClick={onEdit} startIcon={<Icon>tune</Icon>}>
                                    //         Adjust
                                    //     </Button>
                                    // }
                                    >
                                        <UserProfileOverview profile={profile} isOwner onEdit={onEdit} />
                                    </SectionCard>
                                </Grid>

                                {/* Right: Details */}
                                <Grid item xs={12} lg={5}>
                                    <MDBox display="flex" flexDirection="column" gap={3}>
                                        <SectionCard title="About" icon="subject" subtitle="A short intro builds trust.">
                                            {isNonEmpty(profile.bio) ? (
                                                <MDTypography variant="button" color="text" sx={{ whiteSpace: "pre-wrap" }}>
                                                    {profile.bio}
                                                </MDTypography>
                                            ) : (
                                                <EmptyHint text="Add a bio to explain what you do and what you’re looking for." />
                                            )}
                                        </SectionCard>

                                        <SectionCard title="Expertise" icon="local_library" subtitle="Help others find you by keywords.">
                                            <MDBox display="flex" gap={1} flexWrap="wrap">
                                                {isNonEmpty(profile.expertise_tags) ? (
                                                    profile.expertise_tags.map((x) => <Chip key={x} size="small" label={x} />)
                                                ) : (
                                                    <EmptyHint text="Add expertise tags (e.g., MRV, forestry, project finance, auditing)." />
                                                )}
                                            </MDBox>

                                            <MDBox mt={2}>
                                                <MDTypography variant="button" color="text" sx={{ opacity: 0.8 }}>
                                                    Service offerings
                                                </MDTypography>
                                                <MDBox mt={1} display="flex" gap={1} flexWrap="wrap">
                                                    {isNonEmpty(profile.service_offerings) ? (
                                                        profile.service_offerings.map((x) => <Chip key={x} size="small" label={x} variant="outlined" />)
                                                    ) : (
                                                        <EmptyHint text="Add service offerings so partners know how to engage you." />
                                                    )}
                                                </MDBox>
                                            </MDBox>
                                        </SectionCard>

                                        <SectionCard title="Contact" icon="call" subtitle="Only shown if you allow it in visibility settings.">
                                            <KeyValue k="Location" v={[profile.city, profile.country].filter(Boolean).join(", ") || "—"} />
                                            <KeyValue k="Timezone" v={profile.timezone || "—"} />
                                            <Divider sx={{ my: 1.5 }} />
                                            <KeyValue k="Contact email" v={profile.contact_email || "—"} />
                                            <KeyValue k="Phone" v={profile.phone_number || "—"} />
                                            {!isNonEmpty(profile.contact_email) && !isNonEmpty(profile.phone_number) ? (
                                                <MDBox mt={1.5}>
                                                    <EmptyHint text="Add an email or phone so serious partners can reach you faster." />
                                                </MDBox>
                                            ) : null}
                                        </SectionCard>

                                        <SectionCard title="Links" icon="link" subtitle="Make it easy to verify credibility.">
                                            <KeyValue k="LinkedIn" v={profile.linkedin_url || "—"} />
                                            <KeyValue k="Website" v={profile.personal_website || "—"} />
                                            <KeyValue k="Portfolio" v={profile.portfolio_url || "—"} />
                                            {!isNonEmpty(profile.linkedin_url) &&
                                                !isNonEmpty(profile.personal_website) &&
                                                !isNonEmpty(profile.portfolio_url) ? (
                                                <MDBox mt={1.5}>
                                                    <EmptyHint text="Add at least one link (LinkedIn/website/portfolio) to increase trust." />
                                                </MDBox>
                                            ) : null}
                                        </SectionCard>

                                        {/* <SectionCard title="Visibility" icon="shield" subtitle="Control what the directory shows.">
                                            <KeyValue k="Profile visibility" v={profile.is_public ? "Public" : "Private"} />
                                            <KeyValue k="Show email" v={profile.show_contact_email ? "Yes" : "No"} />
                                            <KeyValue k="Show phone" v={profile.show_phone ? "Yes" : "No"} />
                                            <MDBox mt={1.5}>
                                                <Button variant="outlined" onClick={onEdit} startIcon={<Icon>settings</Icon>} fullWidth>
                                                    Update visibility settings
                                                </Button>
                                            </MDBox>
                                        </SectionCard> */}
                                    </MDBox>
                                </Grid>
                            </Grid>
                        </MDBox>
                    </>
                ) : null}
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}