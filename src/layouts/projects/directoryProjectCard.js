import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const DEFAULT_PROJECT_IMAGE = "/images/placeholders/project-cover.jpg";

function normalizeMediaToUrl(maybeMedia) {
    if (!maybeMedia) return null;

    // already a URL
    if (typeof maybeMedia === "string") return maybeMedia;

    // NEW: list endpoint fields / aliases
    return (
        maybeMedia.cover_asset_url ||
        maybeMedia.coverAssetUrl ||
        maybeMedia.asset_url ||
        maybeMedia.assetUrl ||
        null
    );
}

function pickCoverUrl({ coverAssetUrl }) {
    const fromCover = normalizeMediaToUrl(coverAssetUrl);
    if (fromCover) return fromCover;

    return null;
}

function clampTextSx(lines) {
    return {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };
}

function MetaItem({ icon, value }) {
    if (!value) return null;
    return (
        <MDBox display="flex" alignItems="center" gap={0.75} minWidth={0}>
            <Icon fontSize="small" sx={{ opacity: 0.7 }}>
                {icon}
            </Icon>
            <MDTypography variant="button" color="text" sx={{ ...clampTextSx(1), minWidth: 0 }}>
                {value}
            </MDTypography>
        </MDBox>
    );
}

MetaItem.propTypes = {
    icon: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function DirectoryProjectCard({
    id,
    coverAssetUrl,

    name,
    description,
    projectType,
    status,
    sector,
    hostCountry,
    hostRegion,
    registrationPlatform,
    tags = [],

    to,
    basePath = "/projects",
}) {
    const targetRoute =
        to ?? `${basePath}/${id || "demo-id"}`;

    const derivedCoverSrc = useMemo(
        () => pickCoverUrl({ coverAssetUrl }) || null,
        [coverAssetUrl]
    );

    const [imgSrc, setImgSrc] = useState(derivedCoverSrc || DEFAULT_PROJECT_IMAGE);

    useEffect(() => {
        setImgSrc(derivedCoverSrc || DEFAULT_PROJECT_IMAGE);
    }, [derivedCoverSrc]);

    const locationLabel = [hostRegion, hostCountry].filter(Boolean).join(", ");

    const derivedTags = [projectType, sector].filter(Boolean);
    const allTags = (tags?.length ? tags : derivedTags).slice(0, 3);

    return (
        <Card
            component={Link}
            to={targetRoute}
            sx={{
                textDecoration: "none",
                cursor: "pointer",
                height: "100%",
                overflow: "hidden",
                transition: "transform 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
                },
                "&:focus-within": {
                    outline: "2px solid rgba(59,130,246,0.5)",
                    outlineOffset: 2,
                },
            }}
        >
            {/* Cover */}
            <MDBox
                sx={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    bgcolor: "grey.200",
                }}
            >
                <MDBox
                    component="img"
                    src={imgSrc}
                    alt={name || "Project cover"}
                    loading="lazy"
                    decoding="async"
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={() => {
                        // crucial: keep React state on placeholder so it won't flip back
                        setImgSrc(DEFAULT_PROJECT_IMAGE);
                    }}
                />
            </MDBox>

            {/* Body */}
            <MDBox p={2} display="flex" flexDirection="column" height="100%">
                <MDBox mb={1.25}>
                    <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                        <MDTypography
                            variant="h6"
                            fontWeight="medium"
                            sx={{ ...clampTextSx(2), minWidth: 0 }}
                            title={name}
                        >
                            {name}
                        </MDTypography>

                        {status && (
                            <MDBox
                                sx={{
                                    px: 1.25,
                                    py: 0.5,
                                    borderRadius: "md",
                                    bgcolor: "grey.200",
                                    fontSize: 12,
                                    lineHeight: 1,
                                    maxWidth: "50%",
                                    flexShrink: 0,
                                }}
                                title={status}
                            >
                                <MDBox sx={{ ...clampTextSx(1) }}>{status}</MDBox>
                            </MDBox>
                        )}
                    </MDBox>

                    {allTags.length > 0 && (
                        <MDBox mt={0.75} display="flex" flexWrap="wrap" gap={0.75}>
                            {allTags.map((t) => (
                                <MDBox
                                    key={t}
                                    px={1}
                                    py={0.25}
                                    borderRadius="lg"
                                    sx={{
                                        bgcolor: "grey.100",
                                        maxWidth: "100%",
                                    }}
                                    title={t}
                                >
                                    <MDTypography
                                        variant="caption"
                                        fontWeight="medium"
                                        textTransform="uppercase"
                                        sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {t}
                                    </MDTypography>
                                </MDBox>
                            ))}
                        </MDBox>
                    )}
                </MDBox>
                <MDBox mb={1.5} minHeight={0}>
                    <MDTypography variant="button" fontWeight="regular" color="text" sx={{ ...clampTextSx(3) }}>
                        {description || "No description provided."}
                    </MDTypography>
                </MDBox>

                <MDBox
                    mt="auto"
                    pt={1.25}
                    sx={({ palette: { grey } }) => ({
                        borderTop: `1px solid ${grey[200]}`,
                    })}
                    display="flex"
                    flexDirection="column"
                    gap={0.75}
                >
                    <MetaItem icon="place" value={locationLabel} />
                    <MetaItem icon="apartment" value={registrationPlatform} />

                    <MDBox mt={0.5} display="flex" alignItems="center" gap={0.75} sx={{ opacity: 0.8 }}>
                        <MDTypography variant="caption" color="text">
                            View project
                        </MDTypography>
                        <Icon fontSize="small">arrow_forward</Icon>
                    </MDBox>
                </MDBox>
            </MDBox>
        </Card>
    );
}

DirectoryProjectCard.propTypes = {
    id: PropTypes.string,

    coverAssetUrl: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    name: PropTypes.string.isRequired,
    description: PropTypes.node,
    projectType: PropTypes.string,
    status: PropTypes.string,
    sector: PropTypes.string,
    hostCountry: PropTypes.string,
    hostRegion: PropTypes.string,
    registrationPlatform: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    to: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object, // { pathname, search, state }
    ]),
    basePath: PropTypes.string,
};

export default DirectoryProjectCard;