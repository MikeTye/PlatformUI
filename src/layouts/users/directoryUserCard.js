import { useMemo } from "react";
import { Link } from "react-router-dom";

import PropTypes from "prop-types";

import Card from "@mui/material/Card";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";

import PlaceIcon from "@mui/icons-material/Place";
import WorkIcon from "@mui/icons-material/Work";
import LanguageIcon from "@mui/icons-material/Language";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import FolderIcon from "@mui/icons-material/Folder";
import VerifiedIcon from "@mui/icons-material/Verified";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function cleanUrl(url) {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s}`;
}

function clampText(s, max = 160) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    if (t.length <= max) return t;
    return `${t.slice(0, max).trimEnd()}…`;
}

function StatPill({ icon, label, value }) {
    return (
        <MDBox
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.2,
                py: 0.65,
                borderRadius: "999px",
                backgroundColor: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(0,0,0,0.06)",
            }}
        >
            <MDBox sx={{ display: "inline-flex", alignItems: "center" }}>{icon}</MDBox>
            <MDTypography variant="caption" color="text" sx={{ opacity: 0.9 }}>
                {label}:
            </MDTypography>
            <MDTypography variant="caption" fontWeight="medium" color="text">
                {value}
            </MDTypography>
        </MDBox>
    );
}

StatPill.propTypes = {
    icon: PropTypes.node,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default function DirectoryUserCard({ user, onClick, to, basePath = "/users", interactive = true, }) {
    const id = user?.user_id || user?.userId || user?.id;
    const name = user?.full_name || user?.fullName || "User";
    const headline = user?.headline || "";
    const avatarUrl = user?.avatar_asset_url || user?.avatarUrl || null;

    const org = user?.org_display_name || user?.company_legal_name || user?.org_name || "";
    const job = user?.job_title || user?.jobTitle || "";
    const loc = [user?.city, user?.country].filter(Boolean).join(", ");

    const website = useMemo(() => cleanUrl(user?.personal_website), [user?.personal_website]);
    const linkedin = useMemo(() => cleanUrl(user?.linkedin_url), [user?.linkedin_url]);
    const portfolio = useMemo(() => cleanUrl(user?.portfolio_url), [user?.portfolio_url]);

    const bio = useMemo(() => clampText(user?.bio, 180), [user?.bio]);

    const companyCount = Number(user?.company_count ?? user?.companies_count ?? 0);
    const projectCount = Number(user?.project_count ?? user?.projects_count ?? 0);

    const isVerified = !!user?.is_verified;
    const verificationLevel = user?.verification_level ?? null;
    const roleType = user?.role_type || user?.roleType || "";

    const hasCustomClick = interactive && typeof onClick === "function";

    const targetRoute = useMemo(() => {
        if (!interactive) return null;
        if (to) return to;
        if (!id) return null;
        return `${basePath}/${id}`;
    }, [to, id, basePath]);

    const isLink = interactive && !!targetRoute;

    const openLink = (e, href) => {
        e.preventDefault();
        e.stopPropagation();
        if (!href) return;
        window.open(href, "_blank", "noreferrer");
    };

    const cardProps = {};
    if (isLink) {
        cardProps.component = Link;
        cardProps.to = targetRoute;
    }
    if (hasCustomClick) {
        cardProps.onClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick(user);
        };
    }

    return (
        <Card
            {...cardProps}
            sx={{
                cursor: interactive && (isLink || hasCustomClick) ? "pointer" : "default",
                transition: "transform 140ms ease, box-shadow 140ms ease",
                "&:hover": interactive && (isLink || hasCustomClick)
                    ? {
                        transform: "translateY(-2px)",
                        boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
                    }
                    : {},
            }}
        >
            {/* top accent */}
            <MDBox
                sx={{
                    px: 2.5,
                    py: 2,
                    background:
                        "radial-gradient(900px 300px at 15% 0%, rgba(0,200,160,0.22), transparent 60%)," +
                        "radial-gradient(800px 260px at 90% 25%, rgba(0,120,255,0.14), transparent 55%)," +
                        "linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.92))",
                }}
            >
                <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    <MDBox display="flex" alignItems="center" gap={1.75} minWidth={0}>
                        <Avatar
                            src={avatarUrl || undefined}
                            alt={name}
                            sx={{
                                width: 54,
                                height: 54,
                                border: "2px solid rgba(255,255,255,0.9)",
                                boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                            }}
                        />
                        <MDBox minWidth={0}>
                            <MDTypography variant="h6" fontWeight="medium" sx={{ lineHeight: 1.15 }} noWrap>
                                {name}
                            </MDTypography>

                            {headline ? (
                                <MDTypography variant="button" color="text" sx={{ opacity: 0.85 }} noWrap>
                                    {headline}
                                </MDTypography>
                            ) : null}

                            <MDBox display="flex" alignItems="center" gap={1.25} mt={0.75} flexWrap="wrap">
                                {job ? (
                                    <MDBox display="flex" alignItems="center" gap={0.5}>
                                        <WorkIcon fontSize="small" />
                                        <MDTypography variant="caption" color="text" sx={{ opacity: 0.9 }}>
                                            {job}
                                        </MDTypography>
                                    </MDBox>
                                ) : null}

                                {org ? (
                                    <MDTypography variant="caption" color="text" sx={{ opacity: 0.85 }}>
                                        {job ? "• " : ""}
                                        {org}
                                    </MDTypography>
                                ) : null}

                                {loc ? (
                                    <MDBox display="flex" alignItems="center" gap={0.5}>
                                        <PlaceIcon fontSize="small" />
                                        <MDTypography variant="caption" color="text" sx={{ opacity: 0.9 }}>
                                            {loc}
                                        </MDTypography>
                                    </MDBox>
                                ) : null}
                            </MDBox>
                        </MDBox>
                    </MDBox>

                    {/* quick links */}
                    <MDBox display="flex" gap={0.5} flexShrink={0}>
                        {website ? (
                            <Tooltip title="Website">
                                <IconButton size="small" onClick={(e) => openLink(e, website)}>
                                    <LanguageIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : null}
                        {linkedin ? (
                            <Tooltip title="LinkedIn">
                                <IconButton size="small" onClick={(e) => openLink(e, linkedin)}>
                                    <LinkedInIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : null}
                        {portfolio ? (
                            <Tooltip title="Portfolio">
                                <IconButton size="small" onClick={(e) => openLink(e, portfolio)}>
                                    <FolderIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : null}
                    </MDBox>
                </MDBox>
            </MDBox>

            <Divider />

            {/* bio + datapoints */}
            <MDBox px={2.5} py={2}>
                {bio ? (
                    <MDTypography
                        variant="caption"
                        color="text"
                        sx={{
                            opacity: 0.9,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {bio}
                    </MDTypography>
                ) : (
                    <MDTypography variant="caption" color="text" sx={{ opacity: 0.7 }}>
                        No bio yet.
                    </MDTypography>
                )}

                <MDBox mt={1.5}>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        <StatPill
                            icon={<WorkIcon fontSize="small" />}
                            label="Companies"
                            value={Number.isFinite(companyCount) ? companyCount : 0}
                        />
                        <StatPill
                            icon={<FolderIcon fontSize="small" />}
                            label="Projects"
                            value={Number.isFinite(projectCount) ? projectCount : 0}
                        />
                        {roleType ? (
                            <StatPill icon={<WorkIcon fontSize="small" />} label="Role" value={roleType} />
                        ) : null}
                        {isVerified ? (
                            <StatPill
                                icon={<VerifiedIcon fontSize="small" />}
                                label="Verified"
                                value={verificationLevel ? String(verificationLevel) : "Yes"}
                            />
                        ) : (
                            <StatPill icon={<VerifiedIcon fontSize="small" />} label="Verified" value="No" />
                        )}
                    </Stack>
                </MDBox>
            </MDBox>
        </Card>
    );
}

DirectoryUserCard.propTypes = {
    user: PropTypes.object.isRequired,
    onClick: PropTypes.func,
    to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    basePath: PropTypes.string,
};