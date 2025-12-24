import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";

import PublicLayout from "layouts/public/layout/index";

import DataTable from "examples/Tables/DataTable";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const API = process.env.REACT_APP_API;

function PublicCompanyOverview() {
    const { id: companyId } = useParams();
    const navigate = useNavigate();

    const [company, setCompany] = useState(null);
    const [projects, setProjects] = useState([]);
    const [media, setMedia] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const raw = sessionStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const [lightbox, setLightbox] = useState({ open: false, url: "", title: "" });

    const normalizeMediaUrl = (m) => m.signed_url || m.signedUrl || m.asset_url || m.assetUrl;

    const isImageMedia = (m) =>
        ((m.content_type || m.contentType || "") + "").toLowerCase().startsWith("image/");

    const mediaImages = media
        .map((m) => {
            const url = normalizeMediaUrl(m);
            const cover = !!(m.is_cover ?? m.isCover);
            return {
                id: m.id,
                url,
                kind: m.kind || "",
                isCover: cover,
                contentType: (m.content_type || m.contentType || "").toLowerCase(),
                createdAt: m.created_at || m.createdAt || null,
                raw: m,
            };
        })
        .filter((x) => x.url && isImageMedia(x.raw));

    const coverImage = mediaImages.find((x) => x.isCover) || mediaImages[0] || null;
    const galleryImages = coverImage ? mediaImages.filter((x) => x.id !== coverImage.id) : mediaImages;

    const openLightbox = (img) =>
        setLightbox({ open: true, url: img.url, title: img.kind || "Company media" });
    const closeLightbox = () => setLightbox({ open: false, url: "", title: "" });

    const token = sessionStorage.getItem("token");
    const authHeaders = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };

    useEffect(() => {
        if (!companyId) return;

        const fetchData = async () => {
            try {
                // refresh current user from backend if not in sessionStorage
                if (!currentUser && token) {
                    const meRes = await fetch(`${API}/auth/me`, { headers: authHeaders });
                    if (meRes.ok) {
                        const me = await meRes.json();
                        setCurrentUser(me);
                        sessionStorage.setItem("user", JSON.stringify(me));
                    }
                }

                // company details
                const companyRes = await fetch(`${API}/companies/${companyId}`, {
                    headers: authHeaders,
                });
                if (!companyRes.ok) throw new Error("Failed to load company");
                const companyData = await companyRes.json();
                setCompany(companyData);

                // projects associated with company
                const projectsRes = await fetch(
                    `${API}/projects?companyId=${companyId}`,
                    { headers: authHeaders }
                );
                if (projectsRes.ok) {
                    const projectsData = await projectsRes.json();
                    setProjects(Array.isArray(projectsData) ? projectsData : []);
                } else {
                    setProjects([]);
                }

                const [mediaRes, docsRes] = await Promise.all([
                    fetch(`${API}/companies/${companyId}/media`, { headers: authHeaders }),
                    fetch(`${API}/companies/${companyId}/documents`, { headers: authHeaders }),
                ]);

                if (mediaRes.ok) {
                    const mediaData = await mediaRes.json();
                    setMedia(Array.isArray(mediaData?.items) ? mediaData.items : []);
                } else {
                    setMedia([]);
                }

                if (docsRes.ok) {
                    const docsData = await docsRes.json();
                    setDocuments(Array.isArray(docsData?.items) ? docsData.items : []);
                } else {
                    setDocuments([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, token]);

    function CompanyOverview({ company, projects = [] }) {
        const name = company.legal_name || company.legalName || company.name || "Company";
        const about = company.function_description || company.about || "";

        const websiteRaw = company.website_url || company.websiteUrl || "";
        const websiteHref = websiteRaw
            ? websiteRaw.startsWith("http://") || websiteRaw.startsWith("https://")
                ? websiteRaw
                : `https://${websiteRaw}`
            : "";

        const email = company.company_email || company.email || "";
        const phone = company.phone_number || company.phone || "";

        const geo = company.geographical_coverage || company.geographicalCoverage || [];
        const geoArr = Array.isArray(geo)
            ? geo
            : String(geo).split(",").map(s => s.trim()).filter(Boolean);

        const businessRaw = company.business_function || company.businessFunction || "";
        const businessArr = Array.isArray(businessRaw)
            ? businessRaw
            : String(businessRaw).split(",").map(s => s.trim()).filter(Boolean);

        const employees = company.employees_count ?? company.employeesCount ?? null;

        const toIssued = Number(company.to_date_issued ?? 0);
        const toOfftake = Number(company.to_date_offtake ?? 0);
        const toRetired = Number(company.to_date_retired ?? 0);

        const statItems = [
            { label: "Projects", value: projects?.length ?? 0 },
            ...(employees != null ? [{ label: "Employees", value: employees }] : []),
            ...(Number.isFinite(toIssued) ? [{ label: "Issued (to date)", value: toIssued }] : []),
            ...(Number.isFinite(toOfftake) ? [{ label: "Offtake (to date)", value: toOfftake }] : []),
            ...(Number.isFinite(toRetired) ? [{ label: "Retired (to date)", value: toRetired }] : []),
        ].slice(0, 5);

        const Pill = ({ children }) => (
            <MDBox
                sx={{
                    px: 1.2,
                    py: 0.6,
                    borderRadius: 2,
                    backgroundColor: "grey.200",
                    display: "inline-flex",
                    alignItems: "center",
                }}
            >
                <MDTypography variant="caption" color="text">
                    {children}
                </MDTypography>
            </MDBox>
        );

        const Stat = ({ label, value }) => (
            <MDBox sx={{ p: 2, borderRadius: 2, backgroundColor: "grey.100" }}>
                <MDTypography variant="h6" fontWeight="medium">
                    {value}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                    {label}
                </MDTypography>
            </MDBox>
        );

        return (
            <Card>
                <MDBox p={3}>
                    {/* Top row: name + primary CTAs */}
                    <MDBox
                        display="flex"
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        flexDirection={{ xs: "column", md: "row" }}
                        gap={1.5}
                    >


                        <MDBox display="flex" gap={1} flexWrap="wrap">
                            {websiteHref && (
                                <MDButton
                                    component="a"
                                    href={websiteHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="gradient"
                                    color="info"
                                    size="small"
                                >
                                    Visit website
                                </MDButton>
                            )}
                            {email && (
                                <MDButton
                                    component="a"
                                    href={`mailto:${email}`}
                                    variant="outlined"
                                    color="info"
                                    size="small"
                                >
                                    Email
                                </MDButton>
                            )}
                            {/* {phone && (
                                <MDButton
                                    component="a"
                                    href={`tel:${phone}`}
                                    variant="outlined"
                                    color="info"
                                    size="small"
                                >
                                    Call
                                </MDButton>
                            )} */}
                        </MDBox>
                    </MDBox>

                    {/* Stats strip */}
                    <MDBox mt={2} display="grid" gridTemplateColumns={{ xs: "1fr 1fr", md: "repeat(5, 1fr)" }} gap={1.5}>
                        {statItems.map(s => (
                            <Stat key={s.label} label={s.label} value={s.value} />
                        ))}
                    </MDBox>

                    {/* About + Tags */}
                    <MDBox mt={3} display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.2fr 0.8fr" }} gap={2}>
                        <MDBox>
                            <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
                                About
                            </MDTypography>
                            <MDTypography variant="button" color="text" sx={{ whiteSpace: "pre-wrap" }}>
                                {about || "No description provided yet."}
                            </MDTypography>
                        </MDBox>

                        <MDBox>
                            <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
                                Capabilities
                            </MDTypography>

                            <MDTypography variant="caption" color="text">
                                Business functions
                            </MDTypography>
                            <MDBox mt={1} display="flex" flexWrap="wrap" gap={1}>
                                {businessArr.length ? businessArr.slice(0, 10).map((x, i) => <Pill key={`${x}-${i}`}>{x}</Pill>) : <Pill>Not specified</Pill>}
                            </MDBox>

                            <MDBox mt={2}>
                                <MDTypography variant="caption" color="text">
                                    Geographical coverage
                                </MDTypography>
                                <MDBox mt={1} display="flex" flexWrap="wrap" gap={1}>
                                    {geoArr.length ? geoArr.slice(0, 12).map((x, i) => <Pill key={`${x}-${i}`}>{x}</Pill>) : <Pill>Not specified</Pill>}
                                </MDBox>
                            </MDBox>
                        </MDBox>
                    </MDBox>
                </MDBox>
            </Card>
        );
    }

    const ownerId =
        company && (company.owner_user_id || company.ownerUserId || null);

    const isOwner = !!(ownerId && currentUser && currentUser.id === ownerId);

    const projectsTable = {
        columns: [
            { Header: "Project Name", accessor: "name", width: "40%" },
            { Header: "Status", accessor: "status" },
        ],
        rows: projects.map((p) => ({
            name: (
                <MDTypography
                    component={RouterLink}
                    to={`/projects/${p.id}`}
                    variant="button"
                    fontWeight="medium"
                >
                    {p.name || "Untitled project"}
                </MDTypography>
            ),
            status: p.status || "-",
        })),
    };

    const documentsTable = {
        columns: [
            { Header: "Title", accessor: "title", width: "40%" },
            { Header: "Doc Type", accessor: "doc_type" },
            { Header: "Created", accessor: "created_at" },
            { Header: "Download", accessor: "download" },
        ],
        rows: documents.map((d) => {
            const url = d.signed_url || d.signedUrl || d.asset_url || d.assetUrl;
            return {
                title: d.title || "-",
                doc_type: d.doc_type || d.docType || "-",
                created_at: d.created_at || d.createdAt ? new Date(d.created_at || d.createdAt).toLocaleString() : "-",
                download: url ? (
                    <MDTypography
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        variant="button"
                        color="info"
                    >
                        Download
                    </MDTypography>
                ) : (
                    "-"
                ),
            };
        }),
    };

    if (loading) {
        return (
            <PublicLayout>
                <MDBox py={3}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6">Loading company…</MDTypography>
                        </MDBox>
                    </Card>
                </MDBox>
            </PublicLayout>
        );
    }

    if (!company) {
        return (
            <PublicLayout>
                <MDBox py={3}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6">
                                Company not found or not accessible.
                            </MDTypography>
                        </MDBox>
                    </Card>
                </MDBox>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <MDBox py={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3}>
                        <MDBox
                            mb={3}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                        >
                            <MDTypography variant="h5" fontWeight="medium">
                                {company.legal_name || company.legalName || "Company Details"}
                            </MDTypography>

                            <MDBox display="flex" gap={1}>
                                <MDButton
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => navigate(-1)}
                                    size="small"
                                >
                                    Back
                                </MDButton>
                                {isOwner && (
                                    <MDButton
                                        variant="gradient"
                                        color="info"
                                        size="small"
                                        onClick={() => navigate(`/companies/${company.id}/edit`)}
                                    >
                                        Edit company
                                    </MDButton>
                                )}
                            </MDBox>
                        </MDBox>

                        <CompanyOverview company={company} projects={projects} />

                        {/* Media */}
                        <MDBox mt={6} mb={2}>
                            <MDBox mb={1} ml={2} display="flex" alignItems="baseline" justifyContent="space-between">
                                <MDTypography variant="h5" fontWeight="medium">
                                    Company media
                                </MDTypography>
                                {mediaImages.length > 0 && (
                                    <MDTypography variant="button" color="text">
                                        {mediaImages.length} image{mediaImages.length === 1 ? "" : "s"}
                                    </MDTypography>
                                )}
                            </MDBox>

                            {mediaImages.length === 0 ? (
                                <MDBox px={2} pb={2}>
                                    <MDTypography variant="button" color="text">
                                        No media uploaded yet.
                                    </MDTypography>
                                </MDBox>
                            ) : (
                                <MDBox px={2} pb={2}>
                                    {/* Cover / Hero */}
                                    {coverImage && (
                                        <MDBox
                                            onClick={() => openLightbox(coverImage)}
                                            sx={{
                                                cursor: "pointer",
                                                width: "100%",
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                mb: 2,
                                                position: "relative",
                                            }}
                                        >
                                            <MDBox
                                                component="img"
                                                src={coverImage.url}
                                                alt="Company cover"
                                                sx={{
                                                    width: "100%",
                                                    height: { xs: 220, md: 320 },
                                                    objectFit: "cover",
                                                    display: "block",
                                                }}
                                            />
                                            <MDBox
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    background:
                                                        "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.0) 55%)",
                                                }}
                                            />
                                            <MDBox sx={{ position: "absolute", left: 16, bottom: 12, right: 16 }}>
                                                <MDTypography variant="h6" color="white" fontWeight="medium">
                                                    {company.legal_name || company.legalName || "Company"}
                                                </MDTypography>
                                                <MDTypography variant="button" color="white">
                                                    Cover image
                                                </MDTypography>
                                            </MDBox>
                                        </MDBox>
                                    )}

                                    {/* Gallery grid (uniform tiles) */}
                                    {galleryImages.length > 0 && (
                                        <MDBox
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                                                gap: 12,
                                            }}
                                        >
                                            {galleryImages.map((img) => (
                                                <MDBox
                                                    key={img.id}
                                                    onClick={() => openLightbox(img)}
                                                    sx={{
                                                        cursor: "pointer",
                                                        borderRadius: 2,
                                                        overflow: "hidden",
                                                        position: "relative",
                                                        backgroundColor: "grey.200",
                                                    }}
                                                >
                                                    <MDBox
                                                        component="img"
                                                        src={img.url}
                                                        alt="Company gallery"
                                                        sx={{
                                                            width: "100%",
                                                            aspectRatio: "1 / 1",
                                                            objectFit: "cover",
                                                            display: "block",
                                                            transition: "transform 180ms ease",
                                                            "&:hover": { transform: "scale(1.03)" },
                                                        }}
                                                    />
                                                    {/* Optional tiny label */}
                                                    {img.kind ? (
                                                        <MDBox
                                                            sx={{
                                                                position: "absolute",
                                                                left: 8,
                                                                bottom: 8,
                                                                px: 1,
                                                                py: 0.25,
                                                                borderRadius: 1,
                                                                backgroundColor: "rgba(0,0,0,0.55)",
                                                            }}
                                                        >
                                                            <MDTypography variant="caption" color="white">
                                                                {img.kind}
                                                            </MDTypography>
                                                        </MDBox>
                                                    ) : null}
                                                </MDBox>
                                            ))}
                                        </MDBox>
                                    )}

                                    {/* Lightbox */}
                                    <Dialog open={lightbox.open} onClose={closeLightbox} maxWidth="lg" fullWidth>
                                        <MDBox display="flex" alignItems="center" justifyContent="space-between" px={2} pt={1}>
                                            <MDTypography variant="button" fontWeight="medium">
                                                {lightbox.title}
                                            </MDTypography>
                                            <IconButton onClick={closeLightbox} size="small">
                                                <CloseIcon />
                                            </IconButton>
                                        </MDBox>
                                        <DialogContent>
                                            <MDBox
                                                component="img"
                                                src={lightbox.url}
                                                alt="Preview"
                                                sx={{
                                                    width: "100%",
                                                    maxHeight: "75vh",
                                                    objectFit: "contain",
                                                    borderRadius: 2,
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </MDBox>
                            )}
                        </MDBox>

                        {/* Documents */}
                        <MDBox mt={6} mb={2}>
                            <MDBox mb={1} ml={2}>
                                <MDTypography variant="h5" fontWeight="medium">
                                    Company documents
                                </MDTypography>
                            </MDBox>

                            {documents.length === 0 ? (
                                <MDBox px={2} pb={2}>
                                    <MDTypography variant="button" color="text">
                                        No documents uploaded yet.
                                    </MDTypography>
                                </MDBox>
                            ) : (
                                <DataTable
                                    table={documentsTable}
                                    entriesPerPage={false}
                                    showTotalEntries={false}
                                    isSorted={false}
                                />
                            )}
                        </MDBox>

                        {/* Projects list */}
                        <MDBox mt={8} mb={2}>
                            <MDBox mb={1} ml={2}>
                                <MDTypography variant="h5" fontWeight="medium">
                                    Projects for this company
                                </MDTypography>
                            </MDBox>
                            {projects.length === 0 ? (
                                <MDBox px={2} pb={2}>
                                    <MDTypography variant="button" color="text">
                                        No projects linked to this company yet.
                                    </MDTypography>
                                </MDBox>
                            ) : (
                                <DataTable
                                    table={projectsTable}
                                    entriesPerPage={false}
                                    showTotalEntries={false}
                                    isSorted={false}
                                />
                            )}
                        </MDBox>
                    </MDBox>
                </Card>
            </MDBox>
        </PublicLayout>
    );
}

export default PublicCompanyOverview;