import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";

/**
 * DirectoryCompanyCard
 * - Primary input: `company` (backend row, snake_case) from /companies/mycompanies
 * - Legacy props still supported (camelCase) to avoid breaking older screens.
 */
function DirectoryCompanyCard({
    company,

    // legacy props (still supported)
    id,
    color = "dark",
    legalName,
    functionDescription,
    businessFunction,
    geographicalCoverage,
    websiteUrl,
    registrationUrl,

    to,
    basePath = "/companies",
}) {
    const row = company || {};

    // backend (snake_case) + legacy (camelCase) mapping
    const resolvedId = id ?? row.id ?? null;
    const resolvedLegalName = (legalName ?? row.legal_name ?? "").trim();
    const resolvedFunctionDescription = (functionDescription ?? row.function_description ?? "").trim();
    const resolvedBusinessFunction = (businessFunction ?? row.business_function ?? "").trim();
    const resolvedCoverage = geographicalCoverage ?? row.geographical_coverage ?? [];
    const resolvedWebsiteUrl = (websiteUrl ?? row.website_url ?? "").trim();
    const resolvedRegistrationUrl = (registrationUrl ?? row.registration_url ?? "").trim();

    // Your endpoint returns cover_asset_url already normalized via toPublicAssetUrl()
    // So prefer it strongly and keep only minimal fallbacks.
    const pickUrl = (...candidates) => {
        for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c.trim();
        }
        return "";
    };

    const resolvedLogoUrl = pickUrl(
        row.cover_asset_url, // <-- from /mycompanies
        row.logo_url,
        row.image_url,
        row.profile_image_url
    );

    // doc count: show only if > 0
    const resolvedDocumentCount =
        typeof row.document_count === "number"
            ? row.document_count
            : typeof row.documents_count === "number"
                ? row.documents_count
                : 0;

    const showDocsBadge = Number.isFinite(resolvedDocumentCount) && resolvedDocumentCount > 0;

    const initials = resolvedLegalName
        ? resolvedLegalName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("")
        : "?";

    const normalizeUrl = (url) => {
        if (!url || typeof url !== "string") return "";
        const u = url.trim();
        if (!u) return "";
        if (!/^https?:\/\//i.test(u)) return `https://${u}`;
        return u;
    };

    const displayHost = (url) => {
        try {
            const n = normalizeUrl(url);
            if (!n) return "";
            const u = new URL(n);
            return u.host.replace(/^www\./i, "");
        } catch {
            return (url || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        }
    };

    const safeCoverage = Array.isArray(resolvedCoverage)
        ? resolvedCoverage.filter((x) => typeof x === "string" && x.trim()).slice(0, 6)
        : [];

    const hasLogo = !!resolvedLogoUrl;

    const hasExplicitTo = to !== undefined && to !== null;
    const targetRoute = hasExplicitTo
        ? to // can be string or location object
        : resolvedId
            ? `${basePath}/${resolvedId}`
            : null;

    const isClickable = !!targetRoute;
    const CardComponent = isClickable ? RouterLink : "div";
    const cardProps = isClickable ? { to: targetRoute } : {};

    return (
        <Card
            component={CardComponent}
            {...cardProps}
            sx={{
                textDecoration: "none",
                cursor: isClickable ? "pointer" : "default",
                height: "100%",
                overflow: "hidden",
                transition: "transform 120ms ease, box-shadow 120ms ease",
                "&:hover": isClickable ? { transform: "translateY(-2px)" } : undefined,
            }}
        >
            <MDBox p={2} display="flex" flexDirection="column" height="100%">
                {/* Header */}
                <MDBox display="flex" alignItems="flex-start" justifyContent="space-between">
                    <MDBox display="flex" alignItems="center" minWidth={0}>
                        <MDAvatar
                            alt={resolvedLegalName || "Company"}
                            variant="rounded"
                            bgColor={color}
                            src={hasLogo ? resolvedLogoUrl : undefined}
                            sx={{
                                p: hasLogo ? 0 : 1,
                                flexShrink: 0,
                                width: hasLogo ? 72 : 56,
                                height: hasLogo ? 72 : 56,
                                borderRadius: ({ borders: { borderRadius } }) => borderRadius.xl,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: hasLogo ? "1rem" : "1.1rem",
                                bgcolor: hasLogo ? "transparent" : undefined,
                                border: (theme) => (hasLogo ? `1px solid ${theme.palette.divider}` : "none"),
                                boxShadow: hasLogo ? "0 6px 14px rgba(0,0,0,0.10)" : "none",
                                objectFit: "cover",
                            }}
                        >
                            {!hasLogo ? initials : null}
                        </MDAvatar>

                        <MDBox ml={2} minWidth={0} flex={1}>
                            <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" minWidth={0}>
                                <MDTypography
                                    variant="h6"
                                    fontWeight="medium"
                                    sx={{
                                        whiteSpace: { xs: "normal", md: "nowrap" },
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        minWidth: 0,
                                        flex: "1 1 auto",
                                    }}
                                >
                                    {resolvedLegalName || "Unnamed company"}
                                </MDTypography>

                                {showDocsBadge && (
                                    <MDBadge
                                        variant="contained"
                                        color="info"
                                        badgeContent={
                                            <MDBox display="inline-flex" alignItems="center" gap={0.5}>
                                                <Icon fontSize="inherit">description</Icon>
                                                <span>{resolvedDocumentCount}</span>
                                            </MDBox>
                                        }
                                        container
                                    />
                                )}
                            </MDBox>

                            {!!resolvedBusinessFunction && (
                                <MDBox mt={0.6} display="flex" flexWrap="wrap" gap={0.75}>
                                    <MDBadge
                                        variant="contained"
                                        color="success"
                                        badgeContent={resolvedBusinessFunction}
                                        container
                                    />
                                </MDBox>
                            )}
                        </MDBox>
                    </MDBox>
                </MDBox>

                {/* Coverage */}
                {safeCoverage.length > 0 && (
                    <MDBox mt={1.25} display="flex" flexWrap="wrap" gap={0.75} maxWidth="100%">
                        {safeCoverage.map((region) => (
                            <MDBadge
                                key={region}
                                variant="contained"
                                color="info"
                                badgeContent={region}
                                container
                            />
                        ))}
                    </MDBox>
                )}

                {/* Description */}
                <MDBox my={1.5} lineHeight={1.4} flexGrow={1} minHeight={0}>
                    {!!resolvedFunctionDescription && (
                        <MDTypography
                            variant="button"
                            fontWeight="light"
                            color="text"
                            sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                            }}
                        >
                            {resolvedFunctionDescription}
                        </MDTypography>
                    )}
                </MDBox>

                <Divider />

                {/* Footer */}
                <MDBox
                    pt={1.25}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                    flexWrap="wrap"
                >
                    <MDTypography
                        variant="button"
                        color="secondary"
                        sx={{
                            maxWidth: 260,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Website: {resolvedWebsiteUrl ? displayHost(resolvedWebsiteUrl) : "Not provided"}
                    </MDTypography>

                    <MDTypography variant="caption" color="secondary">
                        {isClickable ? (
                            <>
                                View details <Icon fontSize="inherit">chevron_right</Icon>
                            </>
                        ) : (
                            "No details link"
                        )}
                    </MDTypography>
                </MDBox>
            </MDBox>
        </Card>
    );
}

DirectoryCompanyCard.propTypes = {
    company: PropTypes.shape({
        id: PropTypes.string,
        legal_name: PropTypes.string,
        function_description: PropTypes.string,
        geographical_coverage: PropTypes.arrayOf(PropTypes.string),
        website_url: PropTypes.string,
        registration_url: PropTypes.string,
        business_function: PropTypes.string,

        // from /companies/mycompanies
        cover_asset_url: PropTypes.string,
        cover_media_id: PropTypes.string,
        cover_content_type: PropTypes.string,

        // optional counts (if you add them later)
        document_count: PropTypes.number,
        documents_count: PropTypes.number,
    }),

    // legacy props
    id: PropTypes.string,
    color: PropTypes.oneOf([
        "primary",
        "secondary",
        "info",
        "success",
        "warning",
        "error",
        "dark",
        "light",
    ]),
    legalName: PropTypes.string,
    functionDescription: PropTypes.string,
    businessFunction: PropTypes.string,
    geographicalCoverage: PropTypes.arrayOf(PropTypes.string),
    websiteUrl: PropTypes.string,
    registrationUrl: PropTypes.string,

    to: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object, // { pathname, search, state }
    ]),
    basePath: PropTypes.string,
};

export default DirectoryCompanyCard;