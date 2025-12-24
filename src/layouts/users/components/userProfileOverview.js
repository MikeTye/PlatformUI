import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";

import PlaceIcon from "@mui/icons-material/Place";
import WorkIcon from "@mui/icons-material/Work";
import LanguageIcon from "@mui/icons-material/Language";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import FolderIcon from "@mui/icons-material/Folder";
import VerifiedIcon from "@mui/icons-material/Verified";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PublicIcon from "@mui/icons-material/Public";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function cleanUrl(url) {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s}`;
}

function ChipRow({ title, items }) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;

    return (
        <MDBox>
            <MDTypography variant="caption" color="text" fontWeight="medium" sx={{ opacity: 0.8 }}>
                {title}
            </MDTypography>
            <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                {list.map((x) => (
                    <Chip
                        key={`${title}-${x}`}
                        label={x}
                        size="small"
                        sx={{
                            borderRadius: "999px",
                            backgroundColor: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(0,0,0,0.06)",
                        }}
                    />
                ))}
            </Stack>
        </MDBox>
    );
}

function InfoRow({ icon, label, value }) {
    if (!value) return null;
    return (
        <MDBox display="flex" alignItems="center" gap={1}>
            {icon}
            <MDTypography variant="button" color="text" sx={{ opacity: 0.9 }}>
                {label ? (
                    <>
                        <MDTypography component="span" variant="button" fontWeight="medium">
                            {label}:{" "}
                        </MDTypography>
                        {value}
                    </>
                ) : (
                    value
                )}
            </MDTypography>
        </MDBox>
    );
}

export default function UserProfileOverview({ profile, isOwner = false, onEdit }) {
    const avatarUrl = profile?.avatar_asset_url || null;

    const loc = [profile?.city, profile?.country].filter(Boolean).join(", ");
    const org = profile?.org_display_name || profile?.company_legal_name || profile?.org_name || null;

    const website = cleanUrl(profile?.personal_website);
    const linkedin = cleanUrl(profile?.linkedin_url);
    const portfolio = cleanUrl(profile?.portfolio_url);

    const roleType = profile?.role_type || null;
    const timezone = profile?.timezone || null;

    const isVerified = !!profile?.is_verified;
    const verificationLevel = profile?.verification_level || null;
    const verificationNotes = profile?.verification_notes || null;

    const isPublic = profile?.is_public; // owner-only display (public route already filters is_public=true)

    return (
        <MDBox>
            {/* Hero */}
            <Card sx={{ overflow: "hidden", borderRadius: 3, position: "relative" }}>
                <MDBox
                    sx={{
                        px: 3,
                        py: 3,
                        background:
                            "radial-gradient(1200px 400px at 20% 0%, rgba(0,200,160,0.25), transparent 60%)," +
                            "radial-gradient(1000px 400px at 90% 20%, rgba(0,120,255,0.18), transparent 55%)," +
                            "linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.92))",
                    }}
                >
                    <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <MDBox display="flex" gap={2} alignItems="center">
                            <Avatar
                                src={avatarUrl || undefined}
                                alt={profile?.full_name || "Profile avatar"}
                                sx={{
                                    width: 76,
                                    height: 76,
                                    border: "3px solid rgba(255,255,255,0.9)",
                                    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                                }}
                            />

                            <MDBox>
                                <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <MDTypography variant="h4" fontWeight="medium" sx={{ lineHeight: 1.15 }}>
                                        {profile?.full_name || "Profile"}
                                    </MDTypography>

                                    {isVerified ? (
                                        <Chip
                                            icon={<VerifiedIcon />}
                                            label={verificationLevel ? `Verified • ${verificationLevel}` : "Verified"}
                                            size="small"
                                            sx={{
                                                borderRadius: "999px",
                                                backgroundColor: "rgba(0,200,160,0.12)",
                                                border: "1px solid rgba(0,200,160,0.25)",
                                            }}
                                        />
                                    ) : null}

                                    {isOwner ? (
                                        <Chip
                                            icon={<PublicIcon />}
                                            label={isPublic ? "Public" : "Private"}
                                            size="small"
                                            sx={{
                                                borderRadius: "999px",
                                                backgroundColor: isPublic ? "rgba(0,120,255,0.10)" : "rgba(0,0,0,0.06)",
                                                border: "1px solid rgba(0,0,0,0.08)",
                                            }}
                                        />
                                    ) : null}
                                </MDBox>

                                <MDTypography variant="button" color="text" sx={{ opacity: 0.85 }}>
                                    {profile?.headline || ""}
                                </MDTypography>

                                <MDBox mt={1} display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
                                    {profile?.job_title ? (
                                        <MDBox display="flex" alignItems="center" gap={0.75}>
                                            <WorkIcon fontSize="small" />
                                            <MDTypography variant="caption" color="text">
                                                {profile.job_title}
                                            </MDTypography>
                                        </MDBox>
                                    ) : null}

                                    {org ? (
                                        <MDTypography variant="caption" color="text" sx={{ opacity: 0.9 }}>
                                            • {org}
                                        </MDTypography>
                                    ) : null}

                                    {loc ? (
                                        <MDBox display="flex" alignItems="center" gap={0.75}>
                                            <PlaceIcon fontSize="small" />
                                            <MDTypography variant="caption" color="text">
                                                {loc}
                                            </MDTypography>
                                        </MDBox>
                                    ) : null}

                                    {roleType ? (
                                        <MDBox display="flex" alignItems="center" gap={0.75}>
                                            <BadgeOutlinedIcon fontSize="small" />
                                            <MDTypography variant="caption" color="text">
                                                {roleType}
                                            </MDTypography>
                                        </MDBox>
                                    ) : null}

                                    {timezone ? (
                                        <MDBox display="flex" alignItems="center" gap={0.75}>
                                            <AccessTimeIcon fontSize="small" />
                                            <MDTypography variant="caption" color="text">
                                                {timezone}
                                            </MDTypography>
                                        </MDBox>
                                    ) : null}
                                </MDBox>
                            </MDBox>
                        </MDBox>

                        {/* {isOwner ? (
                            <MDBox display="flex" gap={1}>
                                <MDButton variant="contained" color="info" size="small" onClick={onEdit}>
                                    Edit profile
                                </MDButton>
                            </MDBox>
                        ) : null} */}
                    </MDBox>

                    {profile?.bio ? (
                        <MDBox mt={2}>
                            <MDTypography variant="body2" color="text" sx={{ opacity: 0.9 }}>
                                {profile.bio}
                            </MDTypography>
                        </MDBox>
                    ) : null}

                    {isOwner && verificationNotes ? (
                        <MDBox mt={2} display="flex" gap={1} alignItems="flex-start">
                            <ShieldOutlinedIcon fontSize="small" />
                            <MDTypography variant="caption" color="text" sx={{ opacity: 0.8 }}>
                                {verificationNotes}
                            </MDTypography>
                        </MDBox>
                    ) : null}
                </MDBox>
            </Card>

            <MDBox mt={3}>
                <Grid container spacing={3}>
                    {/* Tags / discoverability */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{ borderRadius: 3 }}>
                            <MDBox p={3}>
                                <MDTypography variant="h6">Expertise</MDTypography>
                                <Divider sx={{ my: 2 }} />

                                <MDBox display="flex" flexDirection="column" gap={2.5}>
                                    <ChipRow title="Expertise tags" items={profile?.expertise_tags} />
                                    <ChipRow title="Service offerings" items={profile?.service_offerings} />
                                    <ChipRow title="Sectors" items={profile?.sectors} />
                                    <ChipRow title="Standards" items={profile?.standards} />
                                    <ChipRow title="Languages" items={profile?.languages} />
                                </MDBox>

                                {/* Owner-only debug-ish fields (optional but fully synced) */}
                                {/* {isOwner ? (
                                    <MDBox mt={3}>
                                        <Divider sx={{ my: 2 }} />
                                        <MDTypography variant="caption" color="text" sx={{ opacity: 0.75 }}>
                                            Profile metadata
                                        </MDTypography>
                                        <MDBox mt={1} display="flex" flexDirection="column" gap={0.75}>
                                            <InfoRow
                                                icon={<AccessTimeIcon fontSize="small" />}
                                                label="Created"
                                                value={profile?.created_at ? new Date(profile.created_at).toLocaleString() : null}
                                            />
                                            <InfoRow
                                                icon={<AccessTimeIcon fontSize="small" />}
                                                label="Updated"
                                                value={profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : null}
                                            />
                                        </MDBox>
                                    </MDBox>
                                ) : null} */}
                            </MDBox>
                        </Card>
                    </Grid>

                    {/* Links / contact */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: 3 }}>
                            <MDBox p={3}>
                                <MDTypography variant="h6">Links</MDTypography>
                                <Divider sx={{ my: 2 }} />

                                <MDBox display="flex" flexDirection="column" gap={1.5}>
                                    {website ? (
                                        <MDBox display="flex" alignItems="center" gap={1}>
                                            <LanguageIcon fontSize="small" />
                                            <Link href={website} target="_blank" rel="noreferrer" underline="hover">
                                                Website
                                            </Link>
                                        </MDBox>
                                    ) : null}

                                    {linkedin && (
                                        <MDBox display="flex" alignItems="center" gap={1}>
                                            <LinkedInIcon fontSize="small" />
                                            <Link
                                                href={linkedin}
                                                target="_blank"
                                                rel="noreferrer"
                                                sx={{ display: "inline-block" }}   // 👈 critical
                                            >
                                                <MDTypography variant="button" color="info">
                                                    LinkedIn
                                                </MDTypography>
                                            </Link>
                                        </MDBox>
                                    )}

                                    {portfolio ? (
                                        <MDBox display="flex" alignItems="center" gap={1}>
                                            <FolderIcon fontSize="small" />
                                            <Link href={portfolio} target="_blank" rel="noreferrer" underline="hover">
                                                Portfolio
                                            </Link>
                                        </MDBox>
                                    ) : null}

                                    {!website && !linkedin && !portfolio ? (
                                        <MDTypography variant="caption" color="text" sx={{ opacity: 0.75 }}>
                                            No links provided.
                                        </MDTypography>
                                    ) : null}
                                </MDBox>

                                <MDBox mt={3}>
                                    <MDTypography variant="h6">Contact</MDTypography>
                                    <Divider sx={{ my: 2 }} />

                                    <MDBox display="flex" flexDirection="column" gap={1}>
                                        {profile?.contact_email ? (
                                            <MDTypography variant="button" color="text">
                                                {profile.contact_email}
                                            </MDTypography>
                                        ) : null}

                                        {profile?.phone_number ? (
                                            <MDTypography variant="button" color="text">
                                                {profile.phone_number}
                                            </MDTypography>
                                        ) : null}

                                        {!profile?.contact_email && !profile?.phone_number ? (
                                            <MDTypography variant="caption" color="text" sx={{ opacity: 0.75 }}>
                                                Contact details are not shared.
                                            </MDTypography>
                                        ) : null}
                                    </MDBox>
                                </MDBox>
                            </MDBox>
                        </Card>
                    </Grid>
                </Grid>
            </MDBox>
        </MDBox>
    );
}