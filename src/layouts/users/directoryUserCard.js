import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";

import PlaceIcon from "@mui/icons-material/Place";
import WorkIcon from "@mui/icons-material/Work";
import LanguageIcon from "@mui/icons-material/Language";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import FolderIcon from "@mui/icons-material/Folder";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function cleanUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function pickChips(profile, max = 6) {
  const a = Array.isArray(profile?.expertise_tags) ? profile.expertise_tags : [];
  const b = Array.isArray(profile?.service_offerings) ? profile.service_offerings : [];
  const c = Array.isArray(profile?.sectors) ? profile.sectors : [];
  const d = Array.isArray(profile?.standards) ? profile.standards : [];

  const merged = [...a, ...b, ...c, ...d].filter(Boolean);

  // de-dupe (case-insensitive) while preserving order
  const seen = new Set();
  const out = [];
  for (const x of merged) {
    const k = String(x).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

export default function DirectoryUserCard({ user, onClick }) {
  const navigate = useNavigate();

  const id = user?.user_id || user?.userId || user?.id; // tolerate different shapes
  const name = user?.full_name || user?.fullName || "User";
  const headline = user?.headline || "";
  const avatarUrl = user?.avatar_asset_url || user?.avatarUrl || null;

  const org = user?.org_display_name || user?.company_legal_name || user?.org_name || "";
  const job = user?.job_title || user?.jobTitle || "";
  const loc = [user?.city, user?.country].filter(Boolean).join(", ");

  const website = useMemo(() => cleanUrl(user?.personal_website), [user?.personal_website]);
  const linkedin = useMemo(() => cleanUrl(user?.linkedin_url), [user?.linkedin_url]);
  const portfolio = useMemo(() => cleanUrl(user?.portfolio_url), [user?.portfolio_url]);

  const chips = useMemo(() => pickChips(user, 6), [user]);

  const go = () => {
    if (onClick) return onClick(user);
    if (!id) return;
    navigate(`/users/${id}`);
  };

  const openLink = (e, href) => {
    e.preventDefault();
    e.stopPropagation();
    if (!href) return;
    window.open(href, "_blank", "noreferrer");
  };

  return (
    <Card
      onClick={go}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        cursor: id ? "pointer" : "default",
        transition: "transform 140ms ease, box-shadow 140ms ease",
        "&:hover": {
          transform: id ? "translateY(-2px)" : "none",
          boxShadow: id ? "0 14px 40px rgba(0,0,0,0.12)" : undefined,
        },
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

      {/* chips */}
      <MDBox px={2.5} py={2}>
        {chips?.length ? (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {chips.map((x) => (
              <Chip
                key={x}
                label={x}
                size="small"
                sx={{
                  borderRadius: "999px",
                  backgroundColor: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              />
            ))}
          </Stack>
        ) : (
          <MDTypography variant="caption" color="text" sx={{ opacity: 0.75 }}>
            No tags yet.
          </MDTypography>
        )}
      </MDBox>
    </Card>
  );
}