import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import LinearProgress from "@mui/material/LinearProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Reuse same FormField as project form
import FormField from "layouts/pages/account/components/FormField";

import Autocomplete from "@mui/material/Autocomplete";
import DeleteIcon from "@mui/icons-material/Delete";

import { countries } from "constants/countries";

const API = process.env.REACT_APP_API;

const MAX_COMPANY_MEDIA = 10;
const MAX_COMPANY_DOCS = 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

async function readJsonSafe(res) {
    const txt = await res.text();
    try {
        return txt ? JSON.parse(txt) : {};
    } catch {
        return { raw: txt };
    }
}

function EditCompany() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [form, setForm] = useState({
        legal_name: "",
        function_description: "",
        geographical_coverage: [],
        company_email: "",
        website_url: "",
        phone_number: "",
        registration_url: "",
        employees_count: "",
        business_function: "",
    });

    // --- Existing attachments ---
    const [mediaItems, setMediaItems] = useState([]);
    const [docItems, setDocItems] = useState([]);
    const [loadingCompany, setLoadingCompany] = useState(true);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // --- Upload state ---
    const makeId = () => crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    const [mediaQueue, setMediaQueue] = useState([]); // [{id, file, status, progress, error}]
    const [docQueue, setDocQueue] = useState([]);
    const [docType, setDocType] = useState("Supporting");
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingDocs, setUploadingDocs] = useState(false);

    const token = useMemo(() => sessionStorage.getItem("token"), []);
    const authHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    // Load existing company
    useEffect(() => {
        const loadCompany = async () => {
            try {
                const res = await fetch(`${API}/companies/${id}`, { headers: authHeaders });

                if (!res.ok) {
                    console.error("Fetch company error", await res.text());
                    alert("Failed to load company.");
                    navigate("/companies");
                    return;
                }

                const data = await res.json();

                setForm({
                    legal_name: data.legal_name || "",
                    function_description: data.function_description || "",
                    geographical_coverage: Array.isArray(data.geographical_coverage)
                        ? data.geographical_coverage
                        : [],
                    company_email: data.company_email || "",
                    website_url: data.website_url || "",
                    phone_number: data.phone_number || "",
                    registration_url: data.registration_url || "",
                    employees_count:
                        typeof data.employees_count === "number" ? String(data.employees_count) : "",
                    business_function: data.business_function || "",
                });
            } catch (err) {
                console.error("Fetch company error", err);
                alert("Unexpected error while loading company.");
                navigate("/companies");
            } finally {
                setLoadingCompany(false);
            }
        };

        if (id) loadCompany();
    }, [authHeaders, id, navigate]);

    const loadMedia = async () => {
        if (!id) return;
        setLoadingMedia(true);
        try {
            const res = await fetch(`${API}/companies/${id}/media`, { headers: authHeaders });
            if (!res.ok) {
                console.error("Fetch media error", await res.text());
                return;
            }
            const data = await res.json();
            setMediaItems(Array.isArray(data?.items) ? data.items : []);
        } catch (e) {
            console.error("Fetch media error", e);
        } finally {
            setLoadingMedia(false);
        }
    };

    const loadDocuments = async () => {
        if (!id) return;
        setLoadingDocs(true);
        try {
            const res = await fetch(`${API}/companies/${id}/documents`, { headers: authHeaders });
            if (!res.ok) {
                console.error("Fetch docs error", await res.text());
                return;
            }
            const data = await res.json();
            setDocItems(Array.isArray(data?.items) ? data.items : []);
        } catch (e) {
            console.error("Fetch docs error", e);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        if (!loadingCompany && id) {
            loadMedia();
            loadDocuments();
        }
    }, [loadingCompany, id]);

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    useEffect(() => {
        if (!uploadingMedia) void uploadCompanyMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaQueue]);

    useEffect(() => {
        if (!uploadingDocs) void uploadCompanyDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docQueue]);

    const mediaRemaining = MAX_COMPANY_MEDIA - mediaItems.length - mediaQueue.filter(x => x.status !== "done").length;
    const docRemaining = MAX_COMPANY_DOCS - docItems.length - docQueue.filter(x => x.status !== "done").length;

    const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;

    const validateAndNormalizeSelection = (files, existingQueue, remaining) => {
        const existingKeys = new Set(existingQueue.map(x => fileKey(x.file)));
        const rejected = { tooBig: [], dupes: [], overLimit: 0 };

        const ok = [];
        for (const f of files) {
            if (f.size > MAX_SIZE_BYTES) { rejected.tooBig.push(f); continue; }
            if (existingKeys.has(fileKey(f))) { rejected.dupes.push(f); continue; }
            ok.push(f);
        }

        const picked = ok.slice(0, Math.max(0, remaining));
        rejected.overLimit = Math.max(0, ok.length - picked.length);
        return { picked, rejected };
    };

    const setCoverInQueue = (setQueue, targetId) => {
        setQueue((prev) => prev.map((x) => ({ ...x, isCover: x.id === targetId })));
    };

    const isLikelyImage = (file) => (file?.type || "").startsWith("image/");

    const visibleMediaQueue = mediaQueue.filter((x) => x.status !== "done");

    const enqueue = (setQueue) => (items) => {
        const normalized = (items || []).map((x) => {
            if (x && typeof x === "object" && x.file instanceof File) return { file: x.file, isCover: !!x.isCover };
            return { file: x, isCover: false };
        });

        setQueue((prev) => [
            ...prev,
            ...normalized.map(({ file, isCover }) => ({
                id: makeId(),
                file,
                isCover,
                previewUrl: isLikelyImage(file) ? URL.createObjectURL(file) : null,
                status: "queued",
                progress: 0,
                error: null,
            })),
        ]);
    };

    const formatRejectionMsg = (rejected) => {
        const parts = [];
        if ((rejected.tooBig?.length ?? 0) > 0) parts.push(`${rejected.tooBig.length} too large`);
        if ((rejected.dupes?.length ?? 0) > 0) parts.push(`${rejected.dupes.length} duplicates`);
        if ((rejected.overLimit ?? 0) > 0) parts.push(`${rejected.overLimit} over limit`);
        return parts.length ? `Some files were skipped: ${parts.join(", ")}.` : "";
    };

    // media
    const handleMediaFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        const { picked, rejected } = validateAndNormalizeSelection(files, mediaQueue, mediaRemaining);

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) {
            enqueue(setMediaQueue)(picked.map((file) => ({ file, isCover: false })));
        }

        event.target.value = "";
    };

    // docs
    const handleDocFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        const { picked, rejected } = validateAndNormalizeSelection(files, docQueue, docRemaining);

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) {
            enqueue(setDocQueue)(picked); // docs don’t need isCover
        }

        event.target.value = "";
    };

    const removeFromQueue = (setQueue, id) => {
        setQueue((prev) => {
            const target = prev.find((x) => x.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((x) => x.id !== id);
        });
    };

    useEffect(() => {
        return () => {
            // cleanup on unmount
            for (const x of mediaQueue) if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const uploadCompanyMedia = async () => {
        if (!id) return;
        if (uploadingMedia) return;

        const items = mediaQueue.filter((x) => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        try {
            setUploadingMedia(true);

            for (const item of items) {
                try {
                    const file = item.file;
                    const ext = (file.name.split(".").pop() || "").toLowerCase();
                    const contentType = file.type || "application/octet-stream";

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x))
                    );

                    // 1) get presigned upload URL
                    const urlRes = await fetch(`${API}/companies/${id}/media/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");
                    const { uploadUrl, key, asset_url } = await urlRes.json();

                    // 2) PUT to S3 (no progress in fetch; keep simple “in-flight” UX)
                    const putRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": contentType },
                        body: file,
                    });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, progress: 80 } : x))
                    );

                    // 3) create DB record (backend supports is_cover but does NOT clear old covers) :contentReference[oaicite:3]{index=3}
                    const createRes = await fetch(`${API}/companies/${id}/media`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            s3_key: key,
                            kind: "image",
                            content_type: contentType,
                            metadata: { originalName: file.name, size: file.size },
                            is_cover: false, // enforce exclusivity via PATCH below
                        }),
                    });
                    if (!createRes.ok) throw new Error("Failed to save media metadata.");
                    const created = await createRes.json();

                    // If user marked this queued item as cover, call PATCH cover (clears existing cover server-side) :contentReference[oaicite:4]{index=4}
                    if (item.isCover && created?.id) {
                        const coverRes = await fetch(`${API}/companies/${id}/media/${created.id}/cover`, {
                            method: "PATCH",
                            headers: authHeaders,
                        });
                        if (!coverRes.ok) throw new Error("Uploaded, but failed to set cover image.");
                    }

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x))
                    );
                } catch (e) {
                    setMediaQueue((prev) =>
                        prev.map((x) =>
                            x.id === item.id
                                ? { ...x, status: "error", error: e?.message || "Upload failed", progress: Math.max(0, x.progress || 0) }
                                : x
                        )
                    );
                    continue; // <-- keep uploading the rest
                }
            }

            await loadMedia();
            setMediaQueue((prev) => prev.filter((x) => x.status !== "done"));
        } finally {
            setUploadingMedia(false);
        }
    };

    const uploadCompanyDocuments = async () => {
        if (!id) return;
        if (uploadingDocs) return;

        const items = docQueue.filter((x) => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        // backend requires doc_type :contentReference[oaicite:5]{index=5}
        if (!docType?.trim()) {
            alert("Please enter a document type (e.g. PDD, Validation, Registry Listing).");
            return;
        }

        try {
            setUploadingDocs(true);

            for (const item of items) {
                try {
                    const file = item.file;
                    const ext = (file.name.split(".").pop() || "").toLowerCase();
                    const contentType = file.type || "application/octet-stream";

                    setDocQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x))
                    );

                    // 1) get presigned upload URL
                    const urlRes = await fetch(`${API}/companies/${id}/documents/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt: ext, contentType }),
                    });
                    if (!urlRes.ok) throw new Error("Failed to get upload URL.");
                    const { uploadUrl, s3_key, asset_url } = await urlRes.json();

                    // 2) PUT to S3
                    const putRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": contentType },
                        body: file,
                    });
                    if (!putRes.ok) throw new Error("Failed to upload file.");

                    setDocQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: 80 } : x)));

                    // 3) create DB record (doc_type required, title optional) :contentReference[oaicite:6]{index=6}
                    const createRes = await fetch(`${API}/companies/${id}/documents`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            doc_type: docType.trim(),
                            title: file.name,
                            asset_url,
                            s3_key,
                            content_type: contentType,
                            metadata: { originalName: file.name, size: file.size },
                        }),
                    });
                    if (!createRes.ok) throw new Error("Failed to save document metadata.");

                    setDocQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x))
                    );
                } catch (e) {
                    setDocQueue((prev) =>
                        prev.map((x) =>
                            x.id === item.id
                                ? { ...x, status: "error", error: e?.message || "Upload failed", progress: Math.max(0, x.progress || 0) }
                                : x
                        )
                    );
                    continue;
                }
            }

            await loadDocuments();
            setDocQueue((prev) => prev.filter((x) => x.status !== "done"));
        } finally {
            setUploadingDocs(false);
        }
    };

    const deleteMedia = async (mediaId) => {
        if (!id) return;
        if (!window.confirm("Delete this media item?")) return;

        try {
            const res = await fetch(`${API}/companies/${id}/media/${mediaId}`, {
                method: "DELETE",
                headers: authHeaders,
            });
            if (!res.ok) {
                const body = await readJsonSafe(res);
                console.error("delete media error", body);
                alert("Failed to delete media.");
                return;
            }
            await loadMedia();
        } catch (e) {
            console.error(e);
            alert("Failed to delete media.");
        }
    };

    const deleteDocument = async (documentId) => {
        if (!id) return;
        if (!window.confirm("Delete this document?")) return;

        try {
            const res = await fetch(`${API}/companies/${id}/documents/${documentId}`, {
                method: "DELETE",
                headers: authHeaders,
            });
            if (!res.ok) {
                const body = await readJsonSafe(res);
                console.error("delete doc error", body);
                alert("Failed to delete document.");
                return;
            }
            await loadDocuments();
        } catch (e) {
            console.error(e);
            alert("Failed to delete document.");
        }
    };

    const setCompanyCover = async (mediaId) => {
        if (!id) return;

        const res = await fetch(`${API}/companies/${id}/media/${mediaId}/cover`, {
            method: "PATCH",
            headers: authHeaders,
        });

        if (!res.ok) {
            console.error("Failed to set cover", await res.text());
            alert("Failed to set cover image.");
            return;
        }

        const updated = await res.json();
        setMediaItems(prev => prev.map(m => ({ ...m, is_cover: m.id === updated.id })));
    };

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Keep same required validations as create
        if (!form.legal_name.trim()) return alert("Company legal name is required.");
        if (!form.company_email.trim()) return alert("Company email is required.");
        if (!form.business_function.trim()) return alert("Business function is required.");
        if (!form.geographical_coverage || form.geographical_coverage.length === 0) {
            return alert("Please select at least one geographical coverage.");
        }

        const payload = {
            legal_name: form.legal_name.trim(),
            function_description: form.function_description?.trim() || null,
            geographical_coverage: form.geographical_coverage,
            company_email: form.company_email.trim(),
            website_url: form.website_url?.trim() || null,
            phone_number: form.phone_number?.trim() || null,
            registration_url: form.registration_url?.trim() || null,
            employees_count: form.employees_count ? Number(form.employees_count) : null,
            business_function: form.business_function.trim(),
        };

        setSubmitting(true);
        try {
            const res = await fetch(`${API}/companies/${id}`, {
                method: "PATCH",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await readJsonSafe(res);
                console.error("Update company error", errBody);
                alert("Failed to update company.");
                return;
            }

            const updated = await res.json().catch(() => ({}));
            navigate(updated?.id ? `/companies/${updated.id}` : "/companies");
        } catch (err) {
            console.error("Update company error", err);
            alert("Unexpected error when updating company.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingCompany) {
        return (
            <DashboardLayout>
                <DashboardNavbar light absolute />
                <MDBox mt={10} mb={3} px={3}>
                    <MDTypography variant="h6">Loading company...</MDTypography>
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
                    <MDBox p={3} pb={1}>
                        <MDTypography variant="h5">Edit Company</MDTypography>
                        <MDTypography variant="button" color="text" display="block" mt={0.5}>
                            Add evidence (media/documents) to support claims for carbon projects that weren&apos;t created on your
                            platform.
                        </MDTypography>
                    </MDBox>

                    <Divider />

                    <MDBox component="form" pb={3} px={3} pt={3} onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormField
                                    label="Legal Name *"
                                    placeholder="Legal company name"
                                    value={form.legal_name}
                                    onChange={handleChange("legal_name")}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormField
                                    label="Function / Description"
                                    placeholder="What does this company do?"
                                    multiline
                                    rows={3}
                                    value={form.function_description}
                                    onChange={handleChange("function_description")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Business Function *"
                                    placeholder="e.g. Project Developer, Broker, Marketplace"
                                    value={form.business_function}
                                    onChange={handleChange("business_function")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <MDBox mb={3}>
                                    <MDBox mb={1.625} display="inline-block">
                                        <MDTypography
                                            component="label"
                                            variant="button"
                                            fontWeight="regular"
                                            color="text"
                                            textTransform="capitalize"
                                        >
                                            Geographical coverage *
                                        </MDTypography>
                                    </MDBox>
                                    <Autocomplete
                                        multiple
                                        disableCloseOnSelect
                                        options={countries.map((c) => c.name)}
                                        value={form.geographical_coverage}
                                        onChange={(_, newValue) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                geographical_coverage: newValue,
                                            }))
                                        }
                                        renderInput={(params) => (
                                            <MDInput {...params} variant="standard" placeholder="Select countries" />
                                        )}
                                    />
                                </MDBox>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Company Email *"
                                    placeholder="contact@company.com"
                                    value={form.company_email}
                                    onChange={handleChange("company_email")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Website URL"
                                    placeholder="https://company.com"
                                    value={form.website_url}
                                    onChange={handleChange("website_url")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Phone Number"
                                    placeholder="+60 12 345 6789"
                                    value={form.phone_number}
                                    onChange={handleChange("phone_number")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Registration URL"
                                    placeholder="Link to company registration profile"
                                    value={form.registration_url}
                                    onChange={handleChange("registration_url")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Employees Count"
                                    placeholder="Approx. number of employees"
                                    value={form.employees_count}
                                    onChange={handleChange("employees_count")}
                                />
                            </Grid>

                            <Grid
                                item
                                xs={12}
                                sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                            >
                                <MDButton
                                    variant="text"
                                    color="secondary"
                                    onClick={() => navigate(`/companies/${id}`)}
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
                            </Grid>
                        </Grid>
                    </MDBox>

                    <Divider />

                    <MDBox px={3} py={3}>
                        <MDTypography variant="h6" mb={0.5}>
                            Evidence & Supporting Materials
                        </MDTypography>
                        <MDTypography variant="button" color="text" mb={2} display="block">
                            Add media and documents to support public claims or carbon project involvement.
                        </MDTypography>

                        {/* ===== MEDIA ===== */}
                        <MDBox mb={4}>
                            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <MDTypography variant="subtitle1">Media</MDTypography>
                            </MDBox>

                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleMediaFilesChange}
                                disabled={uploadingMedia || mediaRemaining <= 0}
                            />

                            <MDTypography variant="caption" color="text">
                                Max {MAX_COMPANY_MEDIA} media • Max {Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB per file • Remaining: {mediaRemaining}
                                {mediaRemaining <= 0 ? " • Limit reached" : ""}
                            </MDTypography>

                            {visibleMediaQueue.length > 0 && (
                                <MDBox mt={2} display="flex" flexWrap="wrap" gap={2}>
                                    {visibleMediaQueue.map((x) => (
                                        <MDBox
                                            key={x.id}
                                            sx={({ palette }) => ({
                                                width: 160,
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                border: `1px solid ${x.isCover ? palette.info.main : "#eee"}`,
                                                position: "relative",
                                                backgroundColor: "#fafafa",
                                            })}
                                        >
                                            {x.previewUrl ? (
                                                <img src={x.previewUrl} alt={x.file.name} style={{ width: "100%", display: "block" }} />
                                            ) : (
                                                <MDBox p={2}>
                                                    <MDTypography variant="caption">{x.file.name}</MDTypography>
                                                </MDBox>
                                            )}

                                            {/* progress bar overlay */}
                                            <MDBox sx={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
                                                <LinearProgress variant="determinate" value={x.progress || 0} />
                                            </MDBox>

                                            {/* actions */}
                                            <MDBox
                                                sx={{
                                                    position: "absolute",
                                                    top: 6,
                                                    right: 6,
                                                    display: "flex",
                                                    gap: 0.5,
                                                }}
                                            >
                                                <MDButton
                                                    size="small"
                                                    variant={x.isCover ? "contained" : "text"}
                                                    color="info"
                                                    disabled={x.status === "uploading"}
                                                    onClick={() => setCoverInQueue(setMediaQueue, x.id)}
                                                    sx={{ minWidth: 0, px: 1 }}
                                                >
                                                    {x.isCover ? "Cover" : "Cover"}
                                                </MDButton>

                                                <IconButton disabled={x.status === "uploading"} onClick={() => removeFromQueue(setMediaQueue, x.id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </MDBox>

                                            <MDBox p={1}>
                                                <MDTypography variant="caption" display="block">
                                                    {x.status}{x.error ? ` — ${x.error}` : ""}
                                                </MDTypography>
                                                <MDTypography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                                                    {x.file.name}
                                                </MDTypography>
                                            </MDBox>
                                        </MDBox>
                                    ))}
                                </MDBox>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {loadingMedia ? (
                                <MDTypography variant="button">Loading media…</MDTypography>
                            ) : mediaItems.length === 0 ? (
                                <MDTypography variant="button" color="text">No media uploaded.</MDTypography>
                            ) : (
                                <MDBox mt={1} display="flex" flexWrap="wrap" gap={2}>
                                    {mediaItems.map((m) => (
                                        <MDBox
                                            key={m.id}
                                            sx={({ palette }) => ({
                                                width: 160,
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                border: `2px solid ${m.is_cover ? palette.info.main : "#eee"}`,
                                                position: "relative",
                                                backgroundColor: "#fafafa",
                                            })}
                                        >

                                            <MDBox sx={{ width: "100%", height: 120, overflow: "hidden", backgroundColor: "#f3f3f3" }}>
                                                <img
                                                    src={m.asset_url}
                                                    alt={m.metadata?.originalName || "Company media"}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",     // uniform crop
                                                        display: "block",
                                                    }}
                                                />
                                            </MDBox>

                                            <MDBox
                                                px={1}
                                                py={0.75}
                                                display="flex"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                sx={{
                                                    borderTop: "1px solid #ddd",
                                                    backgroundColor: "rgba(255,255,255,0.95)",
                                                }}
                                            >
                                                {/* Left: cover status / action */}
                                                {m.is_cover ? (
                                                    <MDTypography variant="caption" fontWeight="medium" color="info">
                                                        Cover image
                                                    </MDTypography>
                                                ) : (
                                                    <MDButton
                                                        size="small"
                                                        variant="outlined"
                                                        color="info"
                                                        onClick={() => setCompanyCover(m.id)}
                                                        sx={{ minWidth: 0, px: 1.25, py: 0.25, fontSize: "0.75rem", lineHeight: 1 }}
                                                    >
                                                        Set cover
                                                    </MDButton>
                                                )}

                                                {/* Right: delete (very clear) */}
                                                <IconButton
                                                    onClick={() => deleteMedia(m.id)}
                                                    size="small"
                                                    sx={{
                                                        color: "#fff",
                                                        backgroundColor: "rgba(244, 67, 54, 0.92)", // red-ish
                                                        "&:hover": { backgroundColor: "rgba(244, 67, 54, 1)" },
                                                    }}
                                                    aria-label="Delete image"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </MDBox>

                                            <MDBox
                                                px={1}
                                                py={0.5}
                                                sx={{ borderTop: "1px solid #ddd", backgroundColor: "rgba(255,255,255,0.9)" }}
                                            >
                                                <MDTypography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                                                    {m.metadata?.originalName || ""}
                                                </MDTypography>
                                            </MDBox>
                                        </MDBox>
                                    ))}
                                </MDBox>
                            )}
                        </MDBox>

                        {/* ===== DOCUMENTS ===== */}
                        <MDBox>
                            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <MDTypography variant="subtitle1">Documents</MDTypography>
                            </MDBox>

                            <Grid container spacing={2} mb={1}>
                                <Grid item xs={12} md={6}>
                                    <MDInput
                                        variant="standard"
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value)}
                                        placeholder="e.g. PDD, Validation, Registry Listing"
                                        fullWidth
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                                        onChange={handleDocFilesChange}
                                        disabled={uploadingDocs || docRemaining <= 0}
                                    />
                                </Grid>
                            </Grid>

                            <MDTypography variant="caption" color="text">
                                Max {MAX_COMPANY_DOCS} documents • Max {Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB per file • Remaining: {docRemaining}
                                {docRemaining <= 0 ? " • Limit reached" : ""}
                            </MDTypography>

                            {docQueue.length > 0 && (
                                <List dense>
                                    {docQueue.map((x) => (
                                        <ListItem key={x.id} divider>
                                            <ListItemText
                                                primary={x.file.name}
                                                secondary={`${x.status}${x.error ? ` — ${x.error}` : ""}`}
                                            />
                                            <MDBox sx={{ width: 140, mr: 1 }}>
                                                <LinearProgress variant="determinate" value={x.progress || 0} />
                                            </MDBox>
                                            <IconButton
                                                disabled={x.status === "uploading"}
                                                onClick={() => removeFromQueue(setDocQueue, x.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {loadingDocs ? (
                                <MDTypography variant="button">Loading documents…</MDTypography>
                            ) : docItems.length === 0 ? (
                                <MDTypography variant="button" color="text">No documents uploaded.</MDTypography>
                            ) : (
                                <List dense>
                                    {docItems.map((d) => (
                                        <ListItem key={d.id} divider>
                                            <ListItemText
                                                primary={d.title || d.metadata?.originalName || d.asset_url}
                                                secondary={d.doc_type || ""}
                                            />
                                            <ListItemSecondaryAction>
                                                <MDBox display="flex" gap={1}>
                                                    {d.asset_url && (
                                                        <MDButton
                                                            size="small"
                                                            variant="text"
                                                            onClick={() => window.open(d.asset_url, "_blank")}
                                                        >
                                                            View
                                                        </MDButton>
                                                    )}
                                                    <IconButton onClick={() => deleteDocument(d.id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </MDBox>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </MDBox>
                    </MDBox>
                </Card>
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}

export default EditCompany;