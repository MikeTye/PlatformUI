// src/layouts/projects/project-page/index.js

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";

import { AUDIT_STATUSES } from "constants/auditStatuses";
import { PDD_STATUSES } from "constants/pddStatuses";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";
import Divider from "@mui/material/Divider";

import PublicLayout from "layouts/public/layout/index";

import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const API = process.env.REACT_APP_API;

function formatDate(value) {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

// Simple inline media gallery – expects project.images = [{ src, alt }]
function ProjectMediaGallery({ images }) {
    const safeImages = Array.isArray(images) ? images.filter(Boolean).filter(i => !!i.src) : [];
    const hasImages = safeImages.length > 0;

    const [selectedIdx, setSelectedIdx] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setSelectedIdx(0);
    }, [safeImages.length]);

    const selected = hasImages ? safeImages[Math.min(selectedIdx, safeImages.length - 1)] : null;

    const openLightbox = (idx) => {
        setSelectedIdx(idx);
        setOpen(true);
    };

    const onPrev = () => setSelectedIdx((i) => (i - 1 + safeImages.length) % safeImages.length);
    const onNext = () => setSelectedIdx((i) => (i + 1) % safeImages.length);

    const onKeyDown = (e) => {
        if (!open) return;
        if (e.key === "ArrowLeft") onPrev();
        if (e.key === "ArrowRight") onNext();
        if (e.key === "Escape") setOpen(false);
    };

    const coverSrc = selected?.src || "/images/placeholders/project-cover.jpg";

    return (
        <MDBox onKeyDown={onKeyDown} tabIndex={-1}>
            {/* Main image (consistent aspect ratio) */}
            <MDBox
                sx={{
                    position: "relative",
                    width: "100%",
                    borderRadius: "lg",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    aspectRatio: "16 / 9",
                    bgcolor: "grey.200",
                    cursor: hasImages ? "pointer" : "default",
                }}
                onClick={() => hasImages && openLightbox(selectedIdx)}
                title={hasImages ? "Click to view gallery" : undefined}
            >
                <MDBox
                    component="img"
                    src={coverSrc}
                    alt={selected?.alt || "Project media"}
                    sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />

                {/* subtle overlay hint */}
                {hasImages && (
                    <MDBox
                        sx={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: "md",
                            bgcolor: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            fontSize: 12,
                        }}
                    >
                        {selectedIdx + 1} / {safeImages.length}
                    </MDBox>
                )}
            </MDBox>

            {/* Thumbnails grid */}
            {hasImages && safeImages.length > 1 && (
                <MDBox mt={2}>
                    <ImageList cols={4} gap={10} sx={{ m: 0 }}>
                        {safeImages.slice(0, 8).map((img, idx) => {
                            const active = idx === selectedIdx;
                            return (
                                <ImageListItem
                                    key={img.id || idx}
                                    onClick={() => setSelectedIdx(idx)}
                                    sx={{
                                        cursor: "pointer",
                                        borderRadius: "md",
                                        overflow: "hidden",
                                        border: active ? "2px solid" : "1px solid",
                                        borderColor: active ? "info.main" : "grey.300",
                                        boxShadow: active ? "0 10px 25px rgba(0,0,0,0.15)" : "none",
                                    }}
                                >
                                    <img
                                        src={img.src}
                                        alt={img.alt || `Project image ${idx + 1}`}
                                        loading="lazy"
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                        onDoubleClick={() => openLightbox(idx)}
                                    />
                                </ImageListItem>
                            );
                        })}
                    </ImageList>

                    {safeImages.length > 8 && (
                        <MDTypography variant="caption" color="text" sx={{ display: "block", mt: 1 }}>
                            Showing 8 of {safeImages.length} images. (Open gallery to view all)
                        </MDTypography>
                    )}
                </MDBox>
            )}

            {/* Lightbox */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
                <MDBox sx={{ position: "relative", bgcolor: "black" }}>
                    <MDBox
                        component="img"
                        src={selected?.src}
                        alt={selected?.alt || "Project media"}
                        sx={{
                            width: "100%",
                            maxHeight: "80vh",
                            objectFit: "contain",
                            display: "block",
                            bgcolor: "black",
                        }}
                    />

                    <MDBox sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 1 }}>
                        <Tooltip title="Close">
                            <IconButton onClick={() => setOpen(false)} sx={{ color: "white" }}>
                                <CloseIcon />
                            </IconButton>
                        </Tooltip>
                    </MDBox>

                    {safeImages.length > 1 && (
                        <>
                            <IconButton
                                onClick={onPrev}
                                sx={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", color: "white" }}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                            <IconButton
                                onClick={onNext}
                                sx={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", color: "white" }}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        </>
                    )}

                    <MDBox sx={{ position: "absolute", bottom: 10, left: 10, color: "white", fontSize: 12, opacity: 0.85 }}>
                        {selectedIdx + 1} / {safeImages.length} &nbsp;•&nbsp; Use ← / → keys
                    </MDBox>
                </MDBox>
            </Dialog>
        </MDBox>
    );
}

function PublicProjectOverview() {
    const { id: projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    const [mediaItems, setMediaItems] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docsError, setDocsError] = useState(null);
    const [docTypeFilter, setDocTypeFilter] = useState("all");

    const token = sessionStorage.getItem("token");
    const authHeaders = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };

    const docTypes = useMemo(() => {
        const set = new Set((documents || []).map((d) => d.doc_type).filter(Boolean));
        return ["all", ...Array.from(set).sort()];
    }, [documents]);

    useEffect(() => {
        if (!projectId) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/projects/${projectId}`, {
                    headers: authHeaders,
                });
                if (!res.ok) throw new Error("Failed to load project");
                const data = await res.json();
                setProject(data);

                // 2) Project media
                const mediaRes = await fetch(`${API}/projects/${projectId}/media`, {
                    headers: authHeaders,
                });
                if (mediaRes.ok) {
                    const mediaJson = await mediaRes.json();
                    setMediaItems(mediaJson.items || []);
                } else {
                    setMediaItems([]);
                }

                // 3) Project documents
                setDocuments([]);
                setDocsLoading(false);
            } catch (e) {
                console.error(e);
                setProject(null);
                setMediaItems([]);
                setDocuments([]);
            } finally {
                setLoading(false);
                setDocsLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, token]);

    if (loading) {
        return (
            <PublicLayout>
                <MDBox py={3}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6">Loading project…</MDTypography>
                        </MDBox>
                    </Card>
                </MDBox>
            </PublicLayout>
        );
    }

    if (!project) {
        return (
            <PublicLayout>
                <MDBox py={3}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6">
                                Project not found or not accessible.
                            </MDTypography>
                        </MDBox>
                    </Card>
                </MDBox>
            </PublicLayout>
        );
    }

    // handle snake_case / camelCase mix from backend
    const name = project.name || "Project Details";
    const status = project.status || "Planned";
    const projectType = project.project_type || project.projectType || "-";
    const sector = project.sector || "-";
    const hostCountry = project.host_country || project.hostCountry || "-";
    const hostRegion = project.host_region || project.hostRegion || "-";
    const rawPddStatus = project.pdd_status || project.pddStatus || null;
    const rawAuditStatus = project.audit_status || project.auditStatus || null;

    // generic helper
    const findLabel = (options, value) =>
        options?.find((opt) => opt.value === value)?.label || value || "-";

    const pddStatus = rawPddStatus
        ? findLabel(PDD_STATUSES, rawPddStatus)
        : "-";

    const auditStatus = rawAuditStatus
        ? findLabel(AUDIT_STATUSES, rawAuditStatus)
        : "-";
    const description = project.description || "";

    const registryUrl = project.registry_project_url || project.registryProjectUrl;
    const registrationPlatform =
        project.registration_platform || project.registrationPlatform || "-";
    const methodologyId = project.methodology_id || project.methodologyId || "-";
    const methodologyVersion =
        project.methodology_version || project.methodologyVersion || "-";
    const methodologyNotes =
        project.methodology_notes || project.methodologyNotes || "";

    const tenureText = project.tenure_text || project.tenureText || "";
    const projectMethodologyDocUrl =
        project.project_methodology_doc_url || project.projectMethodologyDocUrl;

    const expectedAnnualReductions =
        project.expected_annual_reductions || project.expectedAnnualReductions;
    const volumeOfferedAuthority =
        project.volume_offered_authority || project.volumeOfferedAuthority;
    const tendererRole = project.tenderer_role || project.tendererRole || "-";

    const isProbablyImage = (item) => {
        const ct = (item?.content_type || "").toLowerCase();
        const kind = (item?.kind || "").toLowerCase();
        // accept if backend marks it as image OR content-type indicates image OR extension looks image-like
        if (kind.includes("image")) return true;
        if (ct.startsWith("image/")) return true;
        const u = (item?.signed_url || item?.asset_url || "").split("?")[0].toLowerCase();
        return /\.(png|jpg|jpeg|webp|gif)$/i.test(u);
    };

    let images = (mediaItems || [])
        .filter(isProbablyImage)
        .map((item) => ({
            id: item.id,
            src: item.signed_url || item.asset_url,
            alt: item.title || item.kind || "Project image",
            isCover: item.is_cover,
        }))
        .filter((x) => !!x.src);

    // keep cover first
    images = images.sort((a, b) => (b.isCover === true) - (a.isCover === true));

    const documentCount = Number(project.document_count ?? project.documentCount ?? 0);
    const hasDocAccess = !!token;

    return (
        <PublicLayout>
            <MDBox py={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3}>
                        {/* Header: title + primary actions */}
                        <MDBox
                            mb={3}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            gap={2}
                        >
                            <MDBox>
                                <MDTypography variant="h5" fontWeight="medium">
                                    {name}
                                </MDTypography>
                                <MDBox display="flex" alignItems="center" gap={1} mt={1}>
                                    <MDBadge
                                        variant="contained"
                                        color="info"
                                        badgeContent={status}
                                        container
                                    />
                                    {projectType !== "-" && (
                                        <MDBadge
                                            variant="contained"
                                            color="secondary"
                                            badgeContent={projectType}
                                            container
                                        />
                                    )}
                                    {sector !== "-" && (
                                        <MDBadge
                                            variant="outlined"
                                            color="dark"
                                            badgeContent={sector}
                                            container
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

                        {/* HERO: media + key overview (like product images + product info) */}
                        <Grid container spacing={3}>
                            <Grid item xs={12} lg={6} xl={5}>
                                <ProjectMediaGallery images={images} />
                            </Grid>

                            <Grid item xs={12} lg={6} xl={7}>
                                {/* Overview / key facts */}
                                <MDBox>
                                    <MDTypography
                                        variant="subtitle2"
                                        fontWeight="medium"
                                        textTransform="uppercase"
                                        color="text"
                                        mb={1}
                                    >
                                        Overview
                                    </MDTypography>

                                    {description && (
                                        <MDTypography variant="body2" mb={2}>
                                            {description}
                                        </MDTypography>
                                    )}

                                    <MDBox mb={1}>
                                        <MDTypography variant="button" fontWeight="medium">
                                            Host location:
                                        </MDTypography>{" "}
                                        <MDTypography variant="button" color="text">
                                            {hostRegion !== "-" ? `${hostRegion}, ` : ""}
                                            {hostCountry}
                                        </MDTypography>
                                    </MDBox>

                                    <MDBox mb={1}>
                                        <MDTypography variant="button" fontWeight="medium">
                                            PDD status:
                                        </MDTypography>{" "}
                                        <MDTypography variant="button" color="text">
                                            {pddStatus}
                                        </MDTypography>
                                    </MDBox>

                                    <MDBox mb={1}>
                                        <MDTypography variant="button" fontWeight="medium">
                                            Audit status:
                                        </MDTypography>{" "}
                                        <MDTypography variant="button" color="text">
                                            {auditStatus}
                                        </MDTypography>
                                    </MDBox>

                                    {registrationPlatform && (
                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registration platform:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {registrationPlatform}
                                            </MDTypography>
                                        </MDBox>
                                    )}

                                    {registryUrl && (
                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registry project URL:
                                            </MDTypography>{" "}
                                            <MDTypography
                                                component="a"
                                                href={registryUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                variant="button"
                                                color="info"
                                            >
                                                {registryUrl}
                                            </MDTypography>
                                        </MDBox>
                                    )}

                                    {tenureText && (
                                        <MDBox mt={2}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Tenure:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {tenureText}
                                            </MDTypography>
                                        </MDBox>
                                    )}
                                </MDBox>
                            </Grid>
                        </Grid>

                        {/* DETAIL SECTIONS – mirroring your create-project side-nav groups */}
                        <MDBox mt={6}>
                            <Grid container spacing={3}>
                                {/* Lifecycle & dates */}
                                <Grid item xs={12} md={6}>
                                    <MDBox>
                                        <MDTypography
                                            variant="subtitle2"
                                            fontWeight="medium"
                                            textTransform="uppercase"
                                            color="text"
                                            mb={1.5}
                                        >
                                            Lifecycle & dates
                                        </MDTypography>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Inception date:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.inception_date || project.inceptionDate
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Implementation start:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.implementation_start ||
                                                    project.implementationStart
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Implementation end:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.implementation_end ||
                                                    project.implementationEnd
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Crediting start:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.crediting_start || project.creditingStart
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Crediting end:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.crediting_end || project.creditingEnd
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Completion date:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.completion_date || project.completionDate
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Credit issuance date:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.credit_issuance_date ||
                                                    project.creditIssuanceDate
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registry date:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.registry_date || project.registryDate
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registration date (expected):
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.registration_date_expected ||
                                                    project.registrationDateExpected
                                                )}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registration date (actual):
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {formatDate(
                                                    project.registration_date_actual ||
                                                    project.registrationDateActual
                                                )}
                                            </MDTypography>
                                        </MDBox>
                                    </MDBox>
                                </Grid>

                                {/* Registry & methodology */}
                                <Grid item xs={12} md={6}>
                                    <MDBox>
                                        <MDTypography
                                            variant="subtitle2"
                                            fontWeight="medium"
                                            textTransform="uppercase"
                                            color="text"
                                            mb={1.5}
                                        >
                                            Registry & methodology
                                        </MDTypography>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Registration platform:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {registrationPlatform}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Methodology ID:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {methodologyId}
                                            </MDTypography>
                                        </MDBox>

                                        <MDBox mb={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                Methodology version:
                                            </MDTypography>{" "}
                                            <MDTypography variant="button" color="text">
                                                {methodologyVersion}
                                            </MDTypography>
                                        </MDBox>

                                        {methodologyNotes && (
                                            <MDBox mb={1}>
                                                <MDTypography variant="button" fontWeight="medium">
                                                    Methodology notes:
                                                </MDTypography>
                                                <MDTypography
                                                    variant="body2"
                                                    color="text"
                                                    sx={{ display: "block" }}
                                                >
                                                    {methodologyNotes}
                                                </MDTypography>
                                            </MDBox>
                                        )}

                                        {projectMethodologyDocUrl && (
                                            <MDBox mb={1}>
                                                <MDTypography variant="button" fontWeight="medium">
                                                    Methodology document:
                                                </MDTypography>{" "}
                                                <MDTypography
                                                    component="a"
                                                    href={projectMethodologyDocUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    variant="button"
                                                    color="info"
                                                >
                                                    Open document
                                                </MDTypography>
                                            </MDBox>
                                        )}
                                    </MDBox>
                                </Grid>

                                {/* Volumes & description / commercial */}
                                <Grid item xs={12}>
                                    <MDBox mt={2}>
                                        <MDTypography
                                            variant="subtitle2"
                                            fontWeight="medium"
                                            textTransform="uppercase"
                                            color="text"
                                            mb={1.5}
                                        >
                                            Volumes & commercial
                                        </MDTypography>

                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <MDBox mb={1}>
                                                    <MDTypography variant="button" fontWeight="medium">
                                                        Expected annual reductions:
                                                    </MDTypography>
                                                    <MDTypography
                                                        variant="body2"
                                                        color="text"
                                                        sx={{ display: "block" }}
                                                    >
                                                        {expectedAnnualReductions
                                                            ? JSON.stringify(expectedAnnualReductions)
                                                            : "-"}
                                                    </MDTypography>
                                                </MDBox>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <MDBox mb={1}>
                                                    <MDTypography variant="button" fontWeight="medium">
                                                        Volume offered to authority:
                                                    </MDTypography>{" "}
                                                    <MDTypography variant="button" color="text">
                                                        {typeof volumeOfferedAuthority === "number" ||
                                                            typeof volumeOfferedAuthority === "bigint"
                                                            ? String(volumeOfferedAuthority)
                                                            : volumeOfferedAuthority || "-"}
                                                    </MDTypography>
                                                </MDBox>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <MDBox mb={1}>
                                                    <MDTypography variant="button" fontWeight="medium">
                                                        Tenderer role:
                                                    </MDTypography>{" "}
                                                    <MDTypography variant="button" color="text">
                                                        {tendererRole}
                                                    </MDTypography>
                                                </MDBox>
                                            </Grid>
                                        </Grid>
                                    </MDBox>
                                </Grid>

                                <Grid item xs={12}>
                                    <MDBox mt={4}>
                                        <MDBox display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                            <MDTypography
                                                variant="subtitle2"
                                                fontWeight="medium"
                                                textTransform="uppercase"
                                                color="text"
                                            >
                                                Documents
                                            </MDTypography>

                                            {/* docType filter */}
                                            <MDBox display="flex" gap={1} flexWrap="wrap">
                                                {docTypes.map((t) => (
                                                    <MDButton
                                                        key={t}
                                                        variant={docTypeFilter === t ? "gradient" : "outlined"}
                                                        color={docTypeFilter === t ? "info" : "secondary"}
                                                        size="small"
                                                        onClick={() => setDocTypeFilter(t)}
                                                    >
                                                        {t}
                                                    </MDButton>
                                                ))}
                                            </MDBox>
                                        </MDBox>

                                        <Divider sx={{ my: 2 }} />

                                        {!hasDocAccess ? (
                                            documentCount > 0 ? (
                                                <Card sx={{ overflow: "hidden" }}>
                                                    <MDBox p={2} display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                                                        <MDBox>
                                                            <MDTypography variant="h6" fontWeight="medium">
                                                                Documents available ({documentCount})
                                                            </MDTypography>
                                                            <MDTypography variant="button" color="text">
                                                                Log in to view or download project documents.
                                                            </MDTypography>
                                                        </MDBox>

                                                        <MDButton
                                                            variant="gradient"
                                                            color="info"
                                                            size="small"
                                                            component={RouterLink}
                                                            to="/authentication/sign-in/illustration"
                                                        >
                                                            Log in
                                                        </MDButton>
                                                    </MDBox>
                                                </Card>
                                            ) : (
                                                <MDTypography variant="button" color="text">
                                                    No documents uploaded.
                                                </MDTypography>
                                            )
                                        ) : (
                                            // existing docsLoading/docsError/filtered list UI stays as-is
                                            <>
                                                {docsLoading ? (
                                                    <MDTypography variant="button" color="text">Loading documents…</MDTypography>
                                                ) : docsError ? (
                                                    <MDTypography variant="button" color="error">{docsError}</MDTypography>
                                                ) : (
                                                    (() => {
                                                        const filtered =
                                                            docTypeFilter === "all"
                                                                ? documents
                                                                : (documents || []).filter((d) => d.doc_type === docTypeFilter);

                                                        return filtered && filtered.length > 0 ? (
                                                            /* your existing list UI */
                                                            <MDBox display="flex" flexDirection="column" gap={1.5}>
                                                                {/* ... */}
                                                            </MDBox>
                                                        ) : (
                                                            <MDTypography variant="button" color="text">
                                                                No documents uploaded.
                                                            </MDTypography>
                                                        );
                                                    })()
                                                )}
                                            </>
                                        )}
                                    </MDBox>
                                </Grid>
                            </Grid>
                        </MDBox>
                    </MDBox>
                </Card>
            </MDBox>
        </PublicLayout>
    );
}

export default PublicProjectOverview;