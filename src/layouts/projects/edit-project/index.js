import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { countries, getCountryLabel, getCountryValue } from "constants/countries";
import { PROJECT_TYPES } from "constants/projectTypes";
import { PROJECT_STATUSES } from "constants/projectStatuses";
import { PDD_STATUSES } from "constants/pddStatuses";
import { AUDIT_STATUSES } from "constants/auditStatuses";
import { MALAYSIAN_STATES } from "constants/malaysianStates";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Reuse the same FormField component
import FormField from "layouts/pages/account/components/FormField";

const API = process.env.REACT_APP_API;
const MAX_DOCUMENTS = process.env.MAX_DOCUMENTS ?? 10;
const MAX_MEDIA = process.env.MAX_MEDIA ?? 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        company_id: "",
        name: "",
        project_type: "",
        sector: "",
        host_country: "",
        host_region: "",
        pdd_status: "",
        audit_status: "",
        inception_date: "",
        credit_issuance_date: "",
        registry_date: "",
        registration_date_expected: "",
        registration_date_actual: "",
        implementation_start: "",
        implementation_end: "",
        crediting_start: "",
        crediting_end: "",
        status: "",
        registry_project_url: "",
        registration_platform: "",
        methodology_id: "",
        methodology_version: "",
        methodology_notes: "",
        tenure_text: "",
        completion_date: "",
        project_methodology_doc_url: "",
        expected_annual_reductions: "",
        volume_offered_authority: "",
        tenderer_role: "",
        description: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [activeSection, setActiveSection] = useState("basic");

    const [mediaItems, setMediaItems] = useState([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [mediaQueue, setMediaQueue] = useState([]); // {id,file,previewUrl,status,progress,error}
    const [docQueue, setDocQueue] = useState([]);

    const [documents, setDocuments] = useState([]);
    const [uploadingDocuments, setUploadingDocuments] = useState(false);

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;
    const isLikelyImage = (file) => (file?.type || "").startsWith("image/");

    const visibleMediaQueue = mediaQueue.filter(x => x.status !== "done");
    const visibleDocQueue = docQueue.filter(x => x.status !== "done");

    const validateAndNormalizeSelection = (files, existingQueue, remaining, maxSizeBytes) => {
        const existingKeys = new Set(existingQueue.map(x => fileKey(x.file)));
        const rejected = { tooBig: [], dupes: [], overLimit: 0 };
        const ok = [];

        for (const f of files) {
            if (f.size > maxSizeBytes) { rejected.tooBig.push(f); continue; }
            if (existingKeys.has(fileKey(f))) { rejected.dupes.push(f); continue; }
            ok.push(f);
        }

        const picked = remaining == null ? ok : ok.slice(0, Math.max(0, remaining));
        rejected.overLimit = remaining == null ? 0 : Math.max(0, ok.length - picked.length);
        return { picked, rejected };
    };

    const formatRejectionMsg = (rejected) => {
        const parts = [];
        if ((rejected.tooBig?.length ?? 0) > 0) parts.push(`${rejected.tooBig.length} too large`);
        if ((rejected.dupes?.length ?? 0) > 0) parts.push(`${rejected.dupes.length} duplicates`);
        if ((rejected.overLimit ?? 0) > 0) parts.push(`${rejected.overLimit} over limit`);
        return parts.length ? `Some files were skipped: ${parts.join(", ")}.` : "";
    };

    const enqueueMedia = (files) => {
        setMediaQueue(prev => [
            ...prev,
            ...files.map(file => ({
                id: makeId(),
                file,
                previewUrl: isLikelyImage(file) ? URL.createObjectURL(file) : null,
                status: "queued",
                progress: 0,
                error: null,
            }))
        ]);
    };

    const enqueueDocs = (files) => {
        setDocQueue(prev => [
            ...prev,
            ...files.map(file => ({
                id: makeId(),
                file,
                previewUrl: null,
                status: "queued",
                progress: 0,
                error: null,
            }))
        ]);
    };

    const [showMediaQueueUI, setShowMediaQueueUI] = useState(false);
    const [showDocQueueUI, setShowDocQueueUI] = useState(false);

    useEffect(() => {
        const visible = mediaQueue.filter(x => x.status !== "done");
        const should =
            visible.length >= 2 || visible.some(x => x.status === "error" || x.status === "uploading");

        if (!should) {
            setShowMediaQueueUI(false);
            return;
        }

        const t = setTimeout(() => setShowMediaQueueUI(true), 450);
        return () => clearTimeout(t);
    }, [mediaQueue]);

    useEffect(() => {
        const visible = docQueue.filter(x => x.status !== "done");
        const should =
            visible.length >= 2 || visible.some(x => x.status === "error" || x.status === "uploading");

        if (!should) {
            setShowDocQueueUI(false);
            return;
        }

        const t = setTimeout(() => setShowDocQueueUI(true), 450);
        return () => clearTimeout(t);
    }, [docQueue]);

    const removeFromQueue = (setQueue, id) => {
        setQueue(prev => {
            const target = prev.find(x => x.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter(x => x.id !== id);
        });
    };

    // cleanup previews on unmount
    useEffect(() => {
        return () => {
            for (const x of mediaQueue) if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadMedia = async () => {
        if (!id) return;
        try {
            const token = sessionStorage.getItem("token");
            const res = await fetch(`${API}/projects/${id}/media`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) {
                console.error("Failed to load project media", await res.text());
                return;
            }

            const data = await res.json();
            setMediaItems(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error("Error loading project media", err);
        }
    };

    const loadDocuments = async () => {
        if (!id) return;
        try {
            const token = sessionStorage.getItem("token");
            const res = await fetch(`${API}/projects/${id}/documents`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) {
                console.error("Failed to load project documents", await res.text());
                return;
            }

            const data = await res.json();
            setDocuments(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error("Error loading project documents", err);
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        if (!id) return;
        if (!window.confirm("Delete this image?")) return;

        const token = sessionStorage.getItem("token");

        try {
            const res = await fetch(`${API}/projects/${id}/media/${mediaId}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) {
                console.error("Failed to delete media", await res.text());
                alert("Failed to delete image.");
                return;
            }

            // Optimistic UI update + refresh in case cover changed server-side
            setMediaItems((prev) => prev.filter((m) => m.id !== mediaId));
            await loadMedia();
        } catch (err) {
            console.error("Error deleting media", err);
            alert("Unexpected error while deleting image.");
        }
    };

    const handleSetCover = async (mediaId) => {
        if (!id) return;

        const token = sessionStorage.getItem("token");

        try {
            const res = await fetch(`${API}/projects/${id}/media/${mediaId}/cover`, {
                method: "PATCH",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) {
                console.error("Failed to set cover", await res.text());
                alert("Failed to set cover image.");
                return;
            }

            const updated = await res.json();

            // Update local state: mark only this as cover
            setMediaItems((prev) =>
                prev.map((m) => ({
                    ...m,
                    is_cover: m.id === updated.id,
                }))
            );
        } catch (err) {
            console.error("Error setting cover", err);
            alert("Unexpected error while setting cover.");
        }
    };

    const handleMediaFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const remaining = Number(MAX_MEDIA) - mediaItems.length - visibleMediaQueue.length;
        if (remaining <= 0) {
            alert(`You can upload up to ${MAX_MEDIA} images only.`);
            event.target.value = "";
            return;
        }

        // same max size you already have
        const { picked, rejected } = validateAndNormalizeSelection(
            files,
            mediaQueue,
            remaining,
            MAX_SIZE_BYTES
        );

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueueMedia(picked);
        event.target.value = "";
    };

    const handleDocumentFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const remaining = Number(MAX_DOCUMENTS) - documents.length - visibleDocQueue.length;
        if (remaining <= 0) {
            alert(`You can upload up to ${MAX_DOCUMENTS} documents only.`);
            event.target.value = "";
            return;
        }

        const { picked, rejected } = validateAndNormalizeSelection(
            files,
            docQueue,
            remaining,
            MAX_SIZE_BYTES
        );

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueueDocs(picked);
        event.target.value = "";
    };

    useEffect(() => {
        if (!uploadingMedia) void uploadProjectMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaQueue]);

    useEffect(() => {
        if (!uploadingDocuments) void uploadProjectDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docQueue]);

    const uploadProjectMedia = async () => {
        if (!id) return;
        if (uploadingMedia) return;

        const items = mediaQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        const token = sessionStorage.getItem("token");
        const authHeaders = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        try {
            setUploadingMedia(true);

            for (const item of items) {
                try {
                    const file = item.file;
                    const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";
                    const contentType = file.type || "application/octet-stream";

                    setMediaQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x
                    ));

                    const urlRes = await fetch(`${API}/projects/${id}/media/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");
                    const { uploadUrl, key, asset_url } = await urlRes.json();

                    const putRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": contentType },
                        body: file,
                    });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    setMediaQueue(prev => prev.map(x => (x.id === item.id ? { ...x, progress: 80 } : x)));

                    const mediaRes = await fetch(`${API}/projects/${id}/media`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            kind: "image",
                            content_type: contentType,
                            sha256: null,
                            metadata: { originalName: file.name, size: file.size },
                            s3_key: key,
                        }),
                    });
                    if (!mediaRes.ok) throw new Error("Failed to save media metadata.");

                    setMediaQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "done", progress: 100 } : x
                    ));
                } catch (e) {
                    setMediaQueue(prev => prev.map(x =>
                        x.id === item.id
                            ? { ...x, status: "error", error: e?.message || "Upload failed", progress: Math.max(0, x.progress || 0) }
                            : x
                    ));
                    continue;
                }
            }

            await loadMedia();
            setMediaQueue(prev => prev.filter(x => x.status !== "done"));
        } finally {
            setUploadingMedia(false);
        }
    };

    const uploadProjectDocuments = async () => {
        if (!id) return;
        if (uploadingDocuments) return;

        const items = docQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        const token = sessionStorage.getItem("token");
        const authHeaders = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        try {
            setUploadingDocuments(true);

            for (const item of items) {
                try {
                    const file = item.file;
                    const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";
                    const contentType = file.type || "application/octet-stream";

                    setDocQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x
                    ));

                    const urlRes = await fetch(`${API}/projects/${id}/documents/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");
                    const { uploadUrl, s3_key, asset_url } = await urlRes.json();

                    const putRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": contentType },
                        body: file,
                    });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    setDocQueue(prev => prev.map(x => (x.id === item.id ? { ...x, progress: 80 } : x)));

                    const docRes = await fetch(`${API}/projects/${id}/documents`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            doc_type: "supporting",
                            title: file.name,
                            asset_url,
                            content_type: contentType,
                            s3_key,
                            metadata: { originalName: file.name, size: file.size },
                        }),
                    });
                    if (!docRes.ok) throw new Error("Failed to save document metadata.");

                    setDocQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "done", progress: 100 } : x
                    ));
                } catch (e) {
                    setDocQueue(prev => prev.map(x =>
                        x.id === item.id
                            ? { ...x, status: "error", error: e?.message || "Upload failed", progress: Math.max(0, x.progress || 0) }
                            : x
                    ));
                    continue;
                }
            }

            await loadDocuments();
            setDocQueue(prev => prev.filter(x => x.status !== "done"));
        } finally {
            setUploadingDocuments(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!id) return;
        if (!window.confirm("Delete this document?")) return;

        const token = sessionStorage.getItem("token");

        try {
            const res = await fetch(`${API}/projects/${id}/documents/${docId}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) {
                console.error("Failed to delete document", await res.text());
                alert("Failed to delete document.");
                return;
            }

            await loadDocuments();
        } catch (err) {
            console.error("Error deleting document", err);
            alert("Unexpected error while deleting document.");
        }
    };

    // Load companies (same as CreateProject)
    useEffect(() => {
        const loadCompanies = async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await fetch(`${API}/companies/mycompanies`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) {
                    console.error("Failed to load my companies");
                    return;
                }
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error loading my companies", err);
            } finally {
                setLoadingCompanies(false);
            }
        };

        loadCompanies();
    }, []);

    // Load project details
    useEffect(() => {
        if (!id) return;

        const loadProject = async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await fetch(`${API}/projects/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!res.ok) {
                    console.error("Failed to load project", await res.text());
                    alert("Unable to load project.");
                    navigate("/projects");
                    return;
                }

                const data = await res.json();

                setForm({
                    company_id: data.company_id ?? "",
                    name: data.name ?? "",
                    project_type: data.project_type ?? "",
                    sector: data.sector ?? "",
                    host_country: data.host_country ?? "",
                    host_region: data.host_region ?? "",
                    pdd_status: data.pdd_status ?? "",
                    audit_status: data.audit_status ?? "",
                    inception_date: data.inception_date ?? "",
                    credit_issuance_date: data.credit_issuance_date ?? "",
                    registry_date: data.registry_date ?? "",
                    registration_date_expected: data.registration_date_expected ?? "",
                    registration_date_actual: data.registration_date_actual ?? "",
                    implementation_start: data.implementation_start ?? "",
                    implementation_end: data.implementation_end ?? "",
                    crediting_start: data.crediting_start ?? "",
                    crediting_end: data.crediting_end ?? "",
                    status: data.status ?? "",
                    registry_project_url: data.registry_project_url ?? "",
                    registration_platform: data.registration_platform ?? "",
                    methodology_id: data.methodology_id ?? "",
                    methodology_version: data.methodology_version ?? "",
                    methodology_notes: data.methodology_notes ?? "",
                    tenure_text: data.tenure_text ?? "",
                    completion_date: data.completion_date ?? "",
                    project_methodology_doc_url: data.project_methodology_doc_url ?? "",
                    expected_annual_reductions:
                        data.expected_annual_reductions != null
                            ? JSON.stringify(data.expected_annual_reductions, null, 2)
                            : "",
                    volume_offered_authority:
                        data.volume_offered_authority != null
                            ? String(data.volume_offered_authority)
                            : "",
                    tenderer_role: data.tenderer_role ?? "",
                    description: data.description ?? "",
                });

                await loadMedia();
                await loadDocuments();
            } catch (err) {
                console.error("Error loading project", err);
                alert("Unexpected error while loading project.");
                navigate("/projects");
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [id, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.name.trim() || !form.project_type.trim()) {
            alert("Project name and type are required.");
            return;
        }

        const payload = {};
        for (const [key, rawValue] of Object.entries(form)) {
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value === "" || value === null || value === undefined) continue;

            if (key === "volume_offered_authority") {
                const num = Number(value);
                if (!Number.isNaN(num)) {
                    payload[key] = num;
                }
                continue;
            }

            if (key === "expected_annual_reductions") {
                try {
                    payload.expected_annual_reductions = JSON.parse(value);
                } catch {
                    alert('Expected annual reductions must be valid JSON (e.g. {"2027":1000}).');
                    return;
                }
                continue;
            }

            payload[key] = value;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem("token");
            const res = await fetch(`${API}/projects/${id}`, {
                method: "PATCH", // PATCH /projects/:id
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                console.error("Edit project error", errBody);
                if (errBody?.error === "not_found") {
                    alert("Project not found or you do not have permission to edit it.");
                } else if (errBody?.error === "invalid_input") {
                    alert("One or more fields are invalid.");
                } else {
                    alert("Failed to save project.");
                }
                return;
            }

            const updated = await res.json();
            if (updated?.id) {
                navigate(`/projects/${updated.id}`);
            } else if (id) {
                navigate(`/projects/${id}`);
            } else {
                navigate("/projects");
            }
        } catch (err) {
            console.error("Edit project error", err);
            alert("Unexpected error when saving project.");
        } finally {
            setSubmitting(false);
        }
    };

    const sections = [
        { id: "basic", icon: "description", label: "Basic Info" },
        { id: "lifecycle", icon: "timeline", label: "Lifecycle & Dates" },
        { id: "registry", icon: "assignment", label: "Registry & Methodology" },
        { id: "quantities", icon: "bar_chart", label: "Volumes & Description" },
        { id: "media", icon: "image", label: "Media" },
    ];

    const renderSection = () => {
        switch (activeSection) {
            case "basic":
                return (
                    <Grid container spacing={3}>
                        {/* Company dropdown */}
                        <Grid item xs={12} sm={6}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    Company
                                </MDTypography>
                            </MDBox>
                            <select
                                disabled={loadingCompanies}
                                value={form.company_id}
                                onChange={handleChange("company_id")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Unassigned</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.legal_name}
                                    </option>
                                ))}
                            </select>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Project Name *"
                                placeholder="My Carbon Project"
                                value={form.name}
                                onChange={handleChange("name")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    Project Type *
                                </MDTypography>
                            </MDBox>
                            <select
                                value={form.project_type}
                                onChange={handleChange("project_type")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Select project type</option>
                                {PROJECT_TYPES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Sector"
                                placeholder="Energy, Forestry, Waste, etc."
                                value={form.sector}
                                onChange={handleChange("sector")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    Host Country
                                </MDTypography>
                            </MDBox>
                            <select
                                value={form.host_country}
                                onChange={handleChange("host_country")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Select country</option>
                                {countries.map((c) => {
                                    const value = getCountryValue(c);
                                    const label = getCountryLabel(c);
                                    return (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            {form.host_country === "Malaysia" || form.host_country === "MY" ? (
                                <>
                                    <MDBox mb={1}>
                                        <MDTypography variant="button" fontWeight="regular">
                                            Host State
                                        </MDTypography>
                                    </MDBox>
                                    <select
                                        value={form.host_region}
                                        onChange={handleChange("host_region")}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: 8,
                                            border: "1px solid #ddd",
                                            fontSize: "0.875rem",
                                        }}
                                    >
                                        <option value="">Select state</option>
                                        {MALAYSIAN_STATES.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <FormField
                                    label="Host Region/State"
                                    placeholder="Selangor"
                                    value={form.host_region}
                                    onChange={handleChange("host_region")}
                                />
                            )}
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    PDD Status
                                </MDTypography>
                            </MDBox>
                            <select
                                value={form.pdd_status}
                                onChange={handleChange("pdd_status")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Select PDD status</option>
                                {PDD_STATUSES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    Audit Status
                                </MDTypography>
                            </MDBox>
                            <select
                                value={form.audit_status}
                                onChange={handleChange("audit_status")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Select audit status</option>
                                {AUDIT_STATUSES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <MDBox mb={1}>
                                <MDTypography variant="button" fontWeight="regular">
                                    Project Status
                                </MDTypography>
                            </MDBox>
                            <select
                                value={form.status}
                                onChange={handleChange("status")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #ddd",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <option value="">Select project status</option>
                                {PROJECT_STATUSES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </Grid>
                    </Grid>
                );

            case "lifecycle":
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Inception Date"
                                type="date"
                                value={form.inception_date}
                                onChange={handleChange("inception_date")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Crediting Start"
                                type="date"
                                value={form.crediting_start}
                                onChange={handleChange("crediting_start")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Crediting End"
                                type="date"
                                value={form.crediting_end}
                                onChange={handleChange("crediting_end")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Implementation Start"
                                type="date"
                                value={form.implementation_start}
                                onChange={handleChange("implementation_start")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Implementation End"
                                type="date"
                                value={form.implementation_end}
                                onChange={handleChange("implementation_end")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Completion Date"
                                type="date"
                                value={form.completion_date}
                                onChange={handleChange("completion_date")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Credit Issuance Date"
                                type="date"
                                value={form.credit_issuance_date}
                                onChange={handleChange("credit_issuance_date")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Registry Date"
                                type="date"
                                value={form.registry_date}
                                onChange={handleChange("registry_date")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Registration Date (Expected)"
                                type="date"
                                value={form.registration_date_expected}
                                onChange={handleChange("registration_date_expected")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormField
                                label="Registration Date (Actual)"
                                type="date"
                                value={form.registration_date_actual}
                                onChange={handleChange("registration_date_actual")}
                            />
                        </Grid>
                    </Grid>
                );

            case "registry":
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Registration Platform"
                                placeholder="Verra, Gold Standard, etc."
                                value={form.registration_platform}
                                onChange={handleChange("registration_platform")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Registry Project URL"
                                placeholder="https://registry.example.com/project/123"
                                value={form.registry_project_url}
                                onChange={handleChange("registry_project_url")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Methodology ID"
                                placeholder="UUID of methodology"
                                value={form.methodology_id}
                                onChange={handleChange("methodology_id")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Methodology Version"
                                value={form.methodology_version}
                                onChange={handleChange("methodology_version")}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormField
                                label="Methodology Notes"
                                multiline
                                rows={2}
                                value={form.methodology_notes}
                                onChange={handleChange("methodology_notes")}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormField
                                label="Project Methodology Doc URL"
                                value={form.project_methodology_doc_url}
                                onChange={handleChange("project_methodology_doc_url")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Tenure Text"
                                placeholder="e.g. 10 years with option to extend"
                                multiline
                                rows={2}
                                value={form.tenure_text}
                                onChange={handleChange("tenure_text")}
                            />
                        </Grid>
                    </Grid>
                );

            case "quantities":
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Expected Annual Reductions (JSON)"
                                placeholder='{"2027": 1000, "2028": 1500}'
                                multiline
                                rows={3}
                                value={form.expected_annual_reductions}
                                onChange={handleChange("expected_annual_reductions")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Volume Offered to Authority"
                                placeholder="Numeric"
                                value={form.volume_offered_authority}
                                onChange={handleChange("volume_offered_authority")}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormField
                                label="Tenderer Role"
                                value={form.tenderer_role}
                                onChange={handleChange("tenderer_role")}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormField
                                label="Project Description"
                                placeholder="Short overview of the project."
                                multiline
                                rows={4}
                                value={form.description}
                                onChange={handleChange("description")}
                            />
                        </Grid>
                    </Grid>
                );

            case "media":
                return (
                    <Grid container spacing={3}>
                        {/* IMAGE MEDIA (UNCHANGED) */}
                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Upload Images (max {MAX_MEDIA})
                            </MDTypography>
                            <MDBox mt={0.5}>
                                <MDTypography variant="caption">
                                    {mediaItems.length} / {MAX_MEDIA} images uploaded
                                </MDTypography>
                            </MDBox>
                            <MDBox mt={1}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleMediaFilesChange}
                                    disabled={uploadingMedia}
                                />
                            </MDBox>
                            {uploadingMedia && (
                                <MDBox mt={1}>
                                    <MDTypography variant="caption">Uploading...</MDTypography>
                                </MDBox>
                            )}
                        </Grid>

                        {showMediaQueueUI && (
                            <Grid item xs={12}>
                                {visibleMediaQueue.length > 0 && (
                                    <MDBox mt={2}>
                                        {visibleMediaQueue.map((q) => (
                                            <MDBox
                                                key={q.id}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                mb={1}
                                                sx={{
                                                    p: 1,
                                                    borderRadius: 2,
                                                    border: "1px solid #eee",
                                                    backgroundColor: "#fafafa",
                                                }}
                                            >
                                                <MDBox display="flex" alignItems="center" sx={{ gap: 1, minWidth: 0 }}>
                                                    {q.previewUrl && (
                                                        <img
                                                            src={q.previewUrl}
                                                            alt=""
                                                            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                                                        />
                                                    )}

                                                    <MDBox sx={{ minWidth: 0 }}>
                                                        <MDTypography variant="button" sx={{ display: "block" }} noWrap>
                                                            {q.file.name}
                                                        </MDTypography>
                                                        <MDTypography variant="caption" color={q.status === "error" ? "error" : "text"}>
                                                            {q.status}
                                                            {q.error ? ` (${q.error})` : ""}
                                                        </MDTypography>
                                                    </MDBox>
                                                </MDBox>

                                                <MDButton
                                                    variant="text"
                                                    color="error"
                                                    disabled={q.status === "uploading"}
                                                    onClick={() => removeFromQueue(setMediaQueue, q.id)}
                                                >
                                                    Remove
                                                </MDButton>
                                            </MDBox>
                                        ))}
                                    </MDBox>
                                )}
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Existing Media
                            </MDTypography>

                            <MDBox mt={1} display="flex" flexWrap="wrap" gap={2}>
                                {mediaItems.length === 0 && (
                                    <MDTypography variant="caption">No media uploaded yet.</MDTypography>
                                )}

                                {mediaItems.map((m) => (
                                    <MDBox
                                        key={m.id}
                                        sx={({ palette }) => ({
                                            width: 140,
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            border: `2px solid ${m.is_cover ? palette.info.main : "#eee"
                                                }`,
                                            position: "relative",
                                            backgroundColor: "#fafafa",
                                        })}
                                    >
                                        <img
                                            src={m.asset_url}
                                            alt="Project media"
                                            style={{ width: "100%", display: "block" }}
                                        />
                                        <MDButton
                                            variant="gradient"
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteMedia(m.id)}
                                            sx={{
                                                position: "absolute",
                                                top: 6,
                                                right: 6,
                                                minWidth: 0,
                                                padding: "6px",
                                                lineHeight: 1,
                                            }}
                                        >
                                            <Icon fontSize="small">delete</Icon>
                                        </MDButton>
                                        <MDBox
                                            px={1}
                                            py={0.5}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{
                                                borderTop: "1px solid #ddd",
                                                backgroundColor: "rgba(255,255,255,0.9)",
                                            }}
                                        >
                                            {m.is_cover ? (
                                                <MDTypography
                                                    variant="caption"
                                                    fontWeight="medium"
                                                    color="info"
                                                >
                                                    Cover image
                                                </MDTypography>
                                            ) : (
                                                <MDButton
                                                    variant="text"
                                                    color="info"
                                                    size="small"
                                                    onClick={() => handleSetCover(m.id)}
                                                    sx={{ fontSize: "0.7rem", padding: 0 }}
                                                >
                                                    Set as cover
                                                </MDButton>
                                            )}
                                        </MDBox>
                                    </MDBox>
                                ))}
                            </MDBox>
                        </Grid>

                        {/* DOCUMENTS SECTION */}
                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Project Documents (max {MAX_DOCUMENTS})
                            </MDTypography>
                            <MDBox mt={0.5}>
                                <MDTypography variant="caption">
                                    {documents.length} / {MAX_DOCUMENTS} documents uploaded
                                </MDTypography>
                            </MDBox>

                            <MDBox mt={1}>
                                <input
                                    type="file"
                                    // allow all types; adjust if you want specific mime-types
                                    onChange={handleDocumentFilesChange}
                                    multiple
                                    disabled={uploadingDocuments || documents.length >= MAX_DOCUMENTS}
                                />
                            </MDBox>
                            {uploadingDocuments && (
                                <MDBox mt={1}>
                                    <MDTypography variant="caption">Uploading documents...</MDTypography>
                                </MDBox>
                            )}
                            {documents.length >= MAX_DOCUMENTS && (
                                <MDBox mt={1}>
                                    <MDTypography variant="caption" color="error">
                                        Maximum of {MAX_DOCUMENTS} documents reached. Delete a document to
                                        upload a new one.
                                    </MDTypography>
                                </MDBox>
                            )}
                        </Grid>

                        {showDocQueueUI && visibleDocQueue.length > 0 && (
                            <MDBox mt={2}>
                                {visibleDocQueue.map(q => (
                                    <MDBox key={q.id} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <MDBox display="flex" alignItems="center" gap={1}>
                                            {q.previewUrl && <img src={q.previewUrl} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />}
                                            <MDTypography variant="button">{q.file.name}</MDTypography>
                                            <MDTypography variant="caption" sx={{ ml: 1 }}>
                                                {q.status}{q.error ? ` (${q.error})` : ""}
                                            </MDTypography>
                                        </MDBox>

                                        <MDButton
                                            variant="text"
                                            color="error"
                                            disabled={q.status === "uploading"}
                                            onClick={() => removeFromQueue(setDocQueue, q.id)}
                                        >
                                            Remove
                                        </MDButton>
                                    </MDBox>
                                ))}
                            </MDBox>
                        )
                        }

                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Existing Documents
                            </MDTypography>

                            <MDBox mt={1}>
                                {documents.length === 0 ? (
                                    <MDTypography variant="caption">
                                        No documents uploaded yet.
                                    </MDTypography>
                                ) : (
                                    <MDBox
                                        component="ul"
                                        p={0}
                                        m={0}
                                        sx={{ listStyle: "none" }}
                                    >
                                        {documents.map((doc) => (
                                            <MDBox
                                                key={doc.id}
                                                component="li"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                py={0.75}
                                                px={1}
                                                mb={0.5}
                                                sx={{
                                                    borderRadius: 1,
                                                    border: "1px solid #eee",
                                                    backgroundColor: "#fafafa",
                                                }}
                                            >
                                                <MDBox display="flex" flexDirection="column">
                                                    <MDTypography variant="button" fontWeight="medium">
                                                        {doc.title || doc.doc_type || "Untitled document"}
                                                    </MDTypography>
                                                    <MDTypography variant="caption">
                                                        {doc.doc_type ? `${doc.doc_type} · ` : ""}
                                                        {doc.asset_url && (
                                                            <a
                                                                href={doc.asset_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                View
                                                            </a>
                                                        )}
                                                    </MDTypography>
                                                </MDBox>
                                                <MDButton
                                                    variant="text"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                >
                                                    Delete
                                                </MDButton>
                                            </MDBox>
                                        ))}
                                    </MDBox>
                                )}
                            </MDBox>
                        </Grid>
                    </Grid>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                    <DashboardNavbar light absolute />
                </MDBox>
                <MDBox mt={10} mb={3} px={3}>
                    <MDTypography variant="button">Loading project...</MDTypography>
                </MDBox>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3}>
                        <MDTypography variant="h5">Edit Project</MDTypography>
                    </MDBox>

                    <MDBox pb={3} px={3}>
                        <Grid container spacing={3}>
                            {/* SIDE NAV */}
                            <Grid item xs={12} lg={3}>
                                <Card
                                    sx={{
                                        borderRadius: ({ borders: { borderRadius } }) =>
                                            borderRadius.lg,
                                        position: "sticky",
                                        top: "1%",
                                    }}
                                >
                                    <MDBox
                                        component="ul"
                                        display="flex"
                                        flexDirection="column"
                                        p={2}
                                        m={0}
                                        sx={{ listStyle: "none" }}
                                    >
                                        {sections.map(({ id: sectionId, icon, label }) => (
                                            <MDBox
                                                key={sectionId}
                                                component="li"
                                                pt={sectionId === sections[0].id ? 0 : 1}
                                            >
                                                <MDBox
                                                    component="button"
                                                    type="button"
                                                    onClick={() => setActiveSection(sectionId)}
                                                    sx={({
                                                        borders: { borderRadius },
                                                        functions: { pxToRem },
                                                        palette: { light, info },
                                                        transitions,
                                                    }) => ({
                                                        width: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        border: "none",
                                                        backgroundColor:
                                                            activeSection === sectionId
                                                                ? info.main
                                                                : "transparent",
                                                        color:
                                                            activeSection === sectionId ? "white" : "inherit",
                                                        borderRadius: borderRadius.md,
                                                        padding: `${pxToRem(10)} ${pxToRem(16)}`,
                                                        cursor: "pointer",
                                                        transition: transitions.create(
                                                            "background-color",
                                                            {
                                                                easing: transitions.easing.easeInOut,
                                                                duration: transitions.duration.shorter,
                                                            }
                                                        ),
                                                        "&:hover": {
                                                            backgroundColor:
                                                                activeSection === sectionId
                                                                    ? info.main
                                                                    : light.main,
                                                        },
                                                    })}
                                                >
                                                    <MDBox mr={1.5} lineHeight={1}>
                                                        <Icon
                                                            fontSize="small"
                                                            style={{
                                                                color:
                                                                    activeSection === sectionId
                                                                        ? "white"
                                                                        : "inherit",
                                                            }}
                                                        >
                                                            {icon}
                                                        </Icon>
                                                    </MDBox>
                                                    <MDTypography
                                                        variant="button"
                                                        fontWeight="regular"
                                                        textTransform="none"
                                                        color={
                                                            activeSection === sectionId ? "white" : "dark"
                                                        }
                                                    >
                                                        {label}
                                                    </MDTypography>
                                                </MDBox>
                                            </MDBox>
                                        ))}
                                    </MDBox>
                                </Card>
                            </Grid>

                            {/* MAIN FORM AREA */}
                            <Grid item xs={12} lg={9}>
                                <MDBox component="form" onSubmit={handleSubmit}>
                                    {renderSection()}

                                    <MDBox
                                        mt={3}
                                        display="flex"
                                        justifyContent="flex-end"
                                        gap={1}
                                    >
                                        <MDButton
                                            variant="text"
                                            color="secondary"
                                            onClick={() =>
                                                id ? navigate(`/projects/${id}`) : navigate("/projects")
                                            }
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </MDButton>
                                        <MDButton
                                            variant="gradient"
                                            color="info"
                                            type="submit"
                                            disabled={submitting}
                                        >
                                            {submitting ? "Saving..." : "Save Changes"}
                                        </MDButton>
                                    </MDBox>
                                </MDBox>
                            </Grid>
                        </Grid>
                    </MDBox>
                </Card>
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}

export default EditProject;