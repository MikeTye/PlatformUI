import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

// Reuse the same FormField component as BasicInfo
import FormField from "layouts/pages/account/components/FormField";

import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import LinearProgress from "@mui/material/LinearProgress";

const API = process.env.REACT_APP_API;
const MAX_DOCUMENTS = Number(process.env.REACT_APP_MAX_DOCUMENTS ?? 10);
const MAX_MEDIA = Number(process.env.REACT_APP_MAX_MEDIA ?? 10);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function CreateProject() {
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
    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    // which section is visible
    const [activeSection, setActiveSection] = useState("basic");

    // Media & document state (local, before save)
    const [mediaFiles, setMediaFiles] = useState([]); // File[]
    const [documentFiles, setDocumentFiles] = useState([]); // File[]
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingDocuments, setUploadingDocuments] = useState(false);

    const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;
    const isLikelyImage = (file) => (file?.type || "").startsWith("image/");

    const [mediaQueue, setMediaQueue] = useState([]); // {id,file,previewUrl,status,error}
    const [docQueue, setDocQueue] = useState([]);     // {id,file,status,error}

    const token = useMemo(() => sessionStorage.getItem("token"), []);
    const authHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    const validateAndNormalizeSelection = (files, existingQueue, remaining, maxSizeBytes) => {
        const existingKeys = new Set(existingQueue.map(x => fileKey(x.file)));
        const rejected = { tooBig: [], dupes: [], overLimit: 0 };
        const ok = [];

        for (const f of files) {
            if (f.size > maxSizeBytes) { rejected.tooBig.push(f); continue; }
            if (existingKeys.has(fileKey(f))) { rejected.dupes.push(f); continue; }
            ok.push(f);
        }

        const picked = ok.slice(0, Math.max(0, remaining));
        rejected.overLimit = Math.max(0, ok.length - picked.length);
        return { picked, rejected };
    };

    const formatRejectionMsg = (rejected) => {
        const parts = [];
        if (rejected.tooBig.length) parts.push(`${rejected.tooBig.length} too large`);
        if (rejected.dupes.length) parts.push(`${rejected.dupes.length} duplicates`);
        if (rejected.overLimit) parts.push(`${rejected.overLimit} over limit`);
        return parts.length ? `Some files were skipped: ${parts.join(", ")}.` : "";
    };

    const enqueueMedia = (files) => {
        setMediaQueue((prev) => [
            ...prev,
            ...files.map((file) => ({
                id: makeId(),
                file,
                isCover: false,
                previewUrl: isLikelyImage(file) ? URL.createObjectURL(file) : null,
                status: "queued",
                progress: 0,
                error: null,
            })),
        ]);
    };

    const enqueueDocs = (files) => {
        setDocQueue(prev => [
            ...prev,
            ...files.map(file => ({
                id: makeId(),
                file,
                status: "queued",
                error: null,
            }))
        ]);
    };

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

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

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

    const handleMediaFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const remaining = MAX_MEDIA - mediaQueue.length;
        if (remaining <= 0) {
            alert(`You can upload up to ${MAX_MEDIA} images only.`);
            event.target.value = "";
            return;
        }

        const { picked, rejected } = validateAndNormalizeSelection(files, mediaQueue, remaining, MAX_SIZE_BYTES);
        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueueMedia(picked);
        event.target.value = "";
    };

    const handleDocumentFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const remaining = MAX_DOCUMENTS - docQueue.length;
        if (remaining <= 0) {
            alert(`You can upload up to ${MAX_DOCUMENTS} documents only.`);
            event.target.value = "";
            return;
        }

        const { picked, rejected } = validateAndNormalizeSelection(files, docQueue, remaining, MAX_SIZE_BYTES);
        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueueDocs(picked);
        event.target.value = "";
    };

    const setCoverInQueue = (targetId) => {
        setMediaQueue((prev) => prev.map((x) => ({ ...x, isCover: x.id === targetId })));
    };

    const visibleMediaQueue = mediaQueue.filter((x) => x.status !== "done");

    const uploadMediaForProject = async (projectId, token) => {
        const items = mediaQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        setUploadingMedia(true);
        try {
            for (const item of items) {
                const file = item.file;
                const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";
                const contentType = file.type || "application/octet-stream";

                setMediaQueue((prev) =>
                    prev.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x))
                );

                try {
                    const urlRes = await fetch(`${API}/projects/${projectId}/media/upload-url`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");
                    const { uploadUrl, key, asset_url } = await urlRes.json();

                    const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, progress: 80 } : x))
                    );

                    const mediaRes = await fetch(`${API}/projects/${projectId}/media`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            kind: "image",
                            content_type: contentType,
                            metadata: { originalName: file.name, size: file.size },
                            s3_key: key,
                            is_cover: false,
                        }),
                    });
                    if (!mediaRes.ok) throw new Error("Failed to save media metadata.");
                    const created = await mediaRes.json();

                    if (item.isCover && created?.id) {
                        const coverRes = await fetch(`${API}/companies/${projectId}/media/${created.id}/cover`, {
                            method: "PATCH",
                            headers: authHeaders,
                        });
                        if (!coverRes.ok) throw new Error("Uploaded, but failed to set cover image.");
                    }

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x))
                    );
                } catch (e) {
                    setMediaQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "error", error: e?.message || "Upload failed" } : x
                    ));
                }
            }
        } finally {
            setUploadingMedia(false);
        }
    };

    const uploadDocumentsForProject = async (projectId, token) => {
        const items = docQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        setUploadingDocuments(true);
        try {
            for (const item of items) {
                const file = item.file;
                const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";
                const contentType = file.type || "application/octet-stream";

                setDocQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "uploading", error: null } : x));

                try {
                    const urlRes = await fetch(`${API}/projects/${projectId}/documents/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");

                    const { uploadUrl, key, asset_url } = await urlRes.json();

                    const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    const docRes = await fetch(`${API}/projects/${projectId}/documents`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            doc_type: "supporting",
                            title: file.name,
                            asset_url,
                            content_type: contentType,
                            sha256: null,
                            metadata: { originalName: file.name, size: file.size },
                            s3_key: key,
                        }),
                    });
                    if (!docRes.ok) throw new Error("Failed to save document metadata.");

                    setDocQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "done" } : x));
                } catch (e) {
                    setDocQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "error", error: e?.message || "Upload failed" } : x
                    ));
                }
            }
        } finally {
            setUploadingDocuments(false);
        }
    };

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
            const res = await fetch(`${API}/projects`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                console.error("Create project error", errBody);
                alert("Failed to create project.");
                return;
            }

            const created = await res.json();

            if (created?.id) {
                const projectId = created.id;

                // After project exists, upload any pending media/docs
                try {
                    if (mediaFiles.length) {
                        await uploadMediaForProject(projectId, token);
                        setMediaFiles([]);
                    }
                    if (documentFiles.length) {
                        await uploadDocumentsForProject(projectId, token);
                        setDocumentFiles([]);
                    }
                } catch (err) {
                    console.error("Error uploading media/documents after create", err);
                    alert("Project created, but some media/documents may have failed to upload.");
                }

                navigate(`/projects/${projectId}`);
            } else {
                navigate("/my-projects");
            }
        } catch (err) {
            console.error("Create project error", err);
            alert("Unexpected error when creating project.");
        } finally {
            setSubmitting(false);
        }
    };

    const sections = [
        { id: "basic", icon: "description", label: "Basic Info" },
        { id: "lifecycle", icon: "timeline", label: "Lifecycle & Dates" },
        { id: "registry", icon: "assignment", label: "Registry & Methodology" },
        { id: "quantities", icon: "bar_chart", label: "Volumes & Description" },
        { id: "media", icon: "image", label: "Media & Documents" },
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
                        {/* IMAGE MEDIA (local before save) */}
                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Upload Images (max {MAX_MEDIA})
                            </MDTypography>
                            <MDBox mt={0.5}>
                                <MDTypography variant="caption">{mediaQueue.length} / {MAX_MEDIA} selected</MDTypography>
                            </MDBox>

                            <MDBox mt={1}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleMediaFilesChange}
                                    disabled={submitting || uploadingMedia || mediaQueue.length >= MAX_MEDIA}
                                />
                            </MDBox>
                        </Grid>

                        {/* Selected Images */}
                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Selected Images
                            </MDTypography>

                            <MDBox mt={1} display="flex" flexWrap="wrap" gap={2}>
                                {visibleMediaQueue.length === 0 ? (
                                    <MDTypography variant="caption">No images selected yet.</MDTypography>
                                ) : (
                                    visibleMediaQueue.map((x) => (
                                        <MDBox
                                            key={x.id}
                                            sx={({ palette }) => ({
                                                width: 180,
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                border: `1px solid ${x.isCover ? palette.info.main : "#eee"}`,
                                                backgroundColor: "#fafafa",
                                                display: "flex",
                                                flexDirection: "column",
                                            })}
                                        >
                                            {/* Thumbnail */}
                                            {x.previewUrl ? (
                                                <MDBox sx={{ width: "100%", height: 120, overflow: "hidden", backgroundColor: "#f3f3f3" }}>
                                                    <img
                                                        src={x.previewUrl}
                                                        alt={x.file.name}
                                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                    />
                                                </MDBox>
                                            ) : (
                                                <MDBox p={2}>
                                                    <MDTypography variant="caption">{x.file.name}</MDTypography>
                                                </MDBox>
                                            )}

                                            {/* Actions (no overlap / no absolute positioning) */}
                                            <MDBox
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1,
                                                    px: 1,
                                                    py: 0.75,
                                                    borderTop: "1px solid #eee",
                                                    backgroundColor: "rgba(255,255,255,0.92)",
                                                }}
                                            >
                                                <MDButton
                                                    size="small"
                                                    variant={x.isCover ? "contained" : "outlined"}
                                                    color="info"
                                                    disabled={x.status === "uploading" || submitting}
                                                    onClick={() => setCoverInQueue(x.id)}
                                                    sx={{ py: 0.25, minWidth: 0 }}
                                                >
                                                    {x.isCover ? "Cover" : "Set cover"}
                                                </MDButton>

                                                <IconButton
                                                    size="small"
                                                    disabled={x.status === "uploading" || submitting}
                                                    onClick={() => removeFromQueue(setMediaQueue, x.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </MDBox>

                                            {/* Filename + status (no overlap) */}
                                            <MDBox sx={{ px: 1, py: 0.75 }}>
                                                <MDTypography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                    title={x.file.name}
                                                >
                                                    {x.file.name}
                                                </MDTypography>

                                                {x.status !== "queued" && (
                                                    <MDTypography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
                                                        {x.status}
                                                        {x.error ? ` — ${x.error}` : ""}
                                                    </MDTypography>
                                                )}
                                            </MDBox>

                                            {/* Progress only while uploading */}
                                            {x.status === "uploading" && (
                                                <MDBox sx={{ px: 1, pb: 1 }}>
                                                    <LinearProgress variant="determinate" value={x.progress || 0} />
                                                </MDBox>
                                            )}
                                        </MDBox>
                                    ))
                                )}
                            </MDBox>
                        </Grid>

                        {/* Documents */}
                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Project Documents (max {MAX_DOCUMENTS})
                            </MDTypography>
                            <MDBox mt={0.5}>
                                <MDTypography variant="caption">{docQueue.length} / {MAX_DOCUMENTS} selected</MDTypography>
                            </MDBox>

                            <MDBox mt={1}>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
                                    onChange={handleDocumentFilesChange}
                                    disabled={uploadingDocuments || submitting || documentFiles.length >= MAX_DOCUMENTS}
                                />
                            </MDBox>
                        </Grid>

                        <Grid item xs={12}>
                            <MDTypography variant="button" fontWeight="regular">
                                Selected Documents
                            </MDTypography>

                            <MDBox mt={1}>
                                {docQueue.length === 0 ? (
                                    <MDTypography variant="caption">No documents selected yet.</MDTypography>
                                ) : (
                                    <MDBox component="ul" p={0} m={0} sx={{ listStyle: "none" }}>
                                        {docQueue.map((q) => (
                                            <MDBox
                                                key={q.id}
                                                component="li"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                py={0.75}
                                                px={1}
                                                mb={0.5}
                                                sx={{ borderRadius: 1, border: "1px solid #eee", backgroundColor: "#fafafa" }}
                                            >
                                                <MDBox sx={{ minWidth: 0 }}>
                                                    <MDTypography variant="button" noWrap>{q.file.name}</MDTypography>
                                                    <MDTypography variant="caption" color={q.status === "error" ? "error" : "text"}>
                                                        {q.status}{q.error ? ` (${q.error})` : ""}
                                                    </MDTypography>
                                                </MDBox>

                                                <MDButton
                                                    variant="text"
                                                    color="error"
                                                    size="small"
                                                    disabled={q.status === "uploading" || submitting}
                                                    onClick={() => removeFromQueue(setDocQueue, q.id)}
                                                >
                                                    Remove
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

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3}>
                        <MDTypography variant="h5">Create Project</MDTypography>
                    </MDBox>

                    <MDBox pb={3} px={3}>
                        <Grid container spacing={3}>
                            {/* SIDE NAV */}
                            <Grid item xs={12} lg={3}>
                                <Card
                                    sx={{
                                        borderRadius: ({ borders: { borderRadius } }) => borderRadius.lg,
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
                                        {sections.map(({ id, icon, label }) => (
                                            <MDBox
                                                key={id}
                                                component="li"
                                                pt={id === sections[0].id ? 0 : 1}
                                            >
                                                <MDBox
                                                    component="button"
                                                    type="button"
                                                    onClick={() => setActiveSection(id)}
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
                                                            activeSection === id ? info.main : "transparent",
                                                        color: activeSection === id ? "white" : "inherit",
                                                        borderRadius: borderRadius.md,
                                                        padding: `${pxToRem(10)} ${pxToRem(16)}`,
                                                        cursor: "pointer",
                                                        transition: transitions.create("background-color", {
                                                            easing: transitions.easing.easeInOut,
                                                            duration: transitions.duration.shorter,
                                                        }),
                                                        "&:hover": {
                                                            backgroundColor:
                                                                activeSection === id ? info.main : light.main,
                                                        },
                                                    })}
                                                >
                                                    <MDBox mr={1.5} lineHeight={1}>
                                                        <Icon
                                                            fontSize="small"
                                                            style={{
                                                                color: activeSection === id ? "white" : "inherit",
                                                            }}
                                                        >
                                                            {icon}
                                                        </Icon>
                                                    </MDBox>
                                                    <MDTypography
                                                        variant="button"
                                                        fontWeight="regular"
                                                        textTransform="none"
                                                        color={activeSection === id ? "white" : "dark"}
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
                                            onClick={() => navigate("/my-projects")}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </MDButton>
                                        <MDButton
                                            variant="gradient"
                                            color="info"
                                            type="submit"
                                            disabled={submitting || uploadingMedia || uploadingDocuments}
                                        >
                                            {submitting ? "Saving..." : "Create Project"}
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

export default CreateProject;