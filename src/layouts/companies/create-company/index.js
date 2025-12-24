import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

import LinearProgress from "@mui/material/LinearProgress";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Reuse same FormField as project form
import FormField from "layouts/pages/account/components/FormField";

import Autocomplete from "@mui/material/Autocomplete";

import { countries } from "constants/countries";

const API = process.env.REACT_APP_API;

const MAX_COMPANY_MEDIA = 10;
const MAX_COMPANY_DOCS = 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function getFileExt(fileName) {
    const base = (fileName || "").split("?")[0].split("#")[0];
    const idx = base.lastIndexOf(".");
    if (idx === -1) return "";
    return base.slice(idx + 1).toLowerCase();
}

async function readJsonSafe(res) {
    const txt = await res.text();
    try {
        return txt ? JSON.parse(txt) : {};
    } catch {
        return { raw: txt };
    }
}

function CreateCompany() {
    const navigate = useNavigate();

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

    const makeId = () => crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    const [mediaQueue, setMediaQueue] = useState([]);
    const [docQueue, setDocQueue] = useState([]);

    const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;
    const isLikelyImage = (file) => (file?.type || "").startsWith("image/");

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

    const formatRejectionMsg = (rejected) => {
        const parts = [];
        if ((rejected.tooBig?.length ?? 0) > 0) parts.push(`${rejected.tooBig.length} too large`);
        if ((rejected.dupes?.length ?? 0) > 0) parts.push(`${rejected.dupes.length} duplicates`);
        if ((rejected.overLimit ?? 0) > 0) parts.push(`${rejected.overLimit} over limit`);
        return parts.length ? `Some files were skipped: ${parts.join(", ")}.` : "";
    };

    const enqueue = (setQueue) => (items) => {
        const normalized = (items || []).map((x) => {
            if (x && typeof x === "object" && x.file instanceof File) return { file: x.file, isCover: !!x.isCover };
            return { file: x, isCover: false };
        });

        setQueue(prev => [
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

    const removeFromQueue = (setQueue, id) => {
        setQueue(prev => {
            const target = prev.find(x => x.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter(x => x.id !== id);
        });
    };

    const setCoverInQueue = (targetId) => {
        setMediaQueue(prev => prev.map(x => ({ ...x, isCover: x.id === targetId })));
    };

    useEffect(() => {
        return () => {
            for (const x of mediaQueue) if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
            for (const x of docQueue) if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mediaRemaining = MAX_COMPANY_MEDIA - mediaQueue.filter(x => x.status !== "done").length;
    const docRemaining = MAX_COMPANY_DOCS - docQueue.filter(x => x.status !== "done").length;

    const visibleMediaQueue = mediaQueue.filter(x => x.status !== "done");

    // Evidence selection (Create)
    const [docType, setDocType] = useState("Supporting");

    const [submitting, setSubmitting] = useState(false);
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

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleMediaFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        const { picked, rejected } = validateAndNormalizeSelection(files, mediaQueue, mediaRemaining);

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueue(setMediaQueue)(picked.map(file => ({ file, isCover: false })));
        event.target.value = "";
    };

    const handleDocFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        const { picked, rejected } = validateAndNormalizeSelection(files, docQueue, docRemaining);

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) enqueue(setDocQueue)(picked);
        event.target.value = "";
    };

    const uploadViaPresignedPut = async ({ uploadUrl, file }) => {
        const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
        });
        if (!putRes.ok) {
            const t = await putRes.text().catch(() => "");
            throw new Error(`S3 upload failed: ${putRes.status} ${t}`);
        }
    };

    const uploadMediaAfterCreate = async (companyId) => {
        const items = mediaQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        setUploadingMedia(true);
        try {
            for (const item of items) {
                try {
                    const file = item.file;
                    const fileExt = getFileExt(file.name);
                    const contentType = file.type || "application/octet-stream";

                    // (optional) mark uploading in UI
                    setMediaQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x));

                    const uRes = await fetch(`${API}/companies/${companyId}/media/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt, contentType }),
                    });
                    if (!uRes.ok) throw new Error("Failed to get media upload URL.");

                    const { uploadUrl, key, asset_url } = await uRes.json();
                    await uploadViaPresignedPut({ uploadUrl, file });

                    setMediaQueue(prev => prev.map(x => x.id === item.id ? { ...x, progress: 80 } : x));

                    const createRes = await fetch(`${API}/companies/${companyId}/media`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            s3_key: key,
                            content_type: contentType,
                            kind: "image",
                            metadata: { original_name: file.name, size: file.size },
                            is_cover: false,
                        }),
                    });
                    if (!createRes.ok) throw new Error("Failed to save media metadata.");
                    const created = await createRes.json();

                    if (item.isCover && created?.id) {
                        const coverRes = await fetch(`${API}/companies/${companyId}/media/${created.id}/cover`, {
                            method: "PATCH",
                            headers: authHeaders,
                        });
                        if (!coverRes.ok) throw new Error("Uploaded, but failed to set cover image.");
                    }

                    setMediaQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "done", progress: 100 } : x));
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

    const uploadDocsAfterCreate = async (companyId) => {
        const items = docQueue.filter(x => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        setUploadingDocs(true);
        try {
            for (const item of items) {
                try {
                    const file = item.file;
                    const fileExt = getFileExt(file.name);
                    const contentType = file.type || "application/octet-stream";

                    // (optional) mark uploading in UI
                    setDocQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x));

                    const uRes = await fetch(`${API}/companies/${companyId}/documents/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt, contentType }),
                    });
                    if (!uRes.ok) throw new Error("Failed to get document upload URL.");

                    const { uploadUrl, key, asset_url } = await uRes.json();
                    await uploadViaPresignedPut({ uploadUrl, file });

                    setDocQueue(prev => prev.map(x => x.id === item.id ? { ...x, progress: 80 } : x));

                    const createRes = await fetch(`${API}/companies/${companyId}/documents`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            asset_url,
                            doc_type: docType,
                            title: file.name,
                            s3_key: key,
                            content_type: contentType,
                            metadata: { original_name: file.name, size: file.size },
                        }),
                    });
                    if (!createRes.ok) throw new Error("Failed to save document metadata.");

                    setDocQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "done", progress: 100 } : x));
                } catch (e) {
                    setDocQueue(prev => prev.map(x =>
                        x.id === item.id ? { ...x, status: "error", error: e?.message || "Upload failed" } : x
                    ));
                }
            }
        } finally {
            setUploadingDocs(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

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
            const res = await fetch(`${API}/companies`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await readJsonSafe(res);
                console.error("Create company error", errBody);
                alert("Failed to create company.");
                return;
            }

            const created = await res.json();
            const companyId = created?.id;
            if (!companyId) {
                navigate("/companies");
                return;
            }

            if (mediaQueue.some(x => x.status === "queued" || x.status === "error")) await uploadMediaAfterCreate(companyId);
            if (docQueue.some(x => x.status === "queued" || x.status === "error")) await uploadDocsAfterCreate(companyId);

            navigate(`/companies/${companyId}`);
        } catch (err) {
            console.error("Create company error", err);
            alert(err?.message || "Unexpected error when creating company.");
        } finally {
            setSubmitting(false);
        }
    };

    const busy = submitting || uploadingMedia || uploadingDocs;

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3} pb={1}>
                        <MDTypography variant="h5">Create Company</MDTypography>
                        <MDTypography variant="button" color="text" display="block" mt={0.5}>
                            Add evidence (media/documents) to support claims for carbon projects that weren&apos;t created on your
                            platform.
                        </MDTypography>
                    </MDBox>

                    <MDBox component="form" pb={3} px={3} pt={2} onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            {/* Details */}
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

                            {/* Evidence (inline, no tabs) */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <MDTypography variant="h6" gutterBottom>
                                    Evidence & Supporting Materials
                                </MDTypography>

                                {/* Media */}
                                <MDBox mb={3}>
                                    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <MDTypography variant="subtitle1">Media</MDTypography>
                                    </MDBox>

                                    <input type="file" multiple accept="image/*" onChange={handleMediaFilesChange} />
                                </MDBox>
                                <MDBox mt={2} display="flex" flexWrap="wrap" gap={2}>
                                    {visibleMediaQueue.map((x) => (
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

                                            {/* Actions (no absolute positioning) */}
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
                                                    disabled={x.status === "uploading"}
                                                    onClick={() => setCoverInQueue(x.id)}
                                                    sx={{ py: 0.25, minWidth: 0 }}
                                                >
                                                    {x.isCover ? "Cover" : "Set cover"}
                                                </MDButton>

                                                <IconButton
                                                    size="small"
                                                    disabled={x.status === "uploading"}
                                                    onClick={() => removeFromQueue(setMediaQueue, x.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </MDBox>

                                            {/* Filename (no overlap) */}
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

                                                {/* Only show status when not queued */}
                                                {x.status !== "queued" && (
                                                    <MDTypography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
                                                        {x.status}{x.error ? ` — ${x.error}` : ""}
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
                                    ))}
                                </MDBox>

                                {/* Documents */}
                                <MDBox>
                                    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <MDTypography variant="subtitle1">Documents</MDTypography>
                                    </MDBox>

                                    <Grid container spacing={2} alignItems="flex-end">
                                        <Grid item xs={12} md={6}>
                                            <MDTypography variant="button" color="text" display="block" mb={1}>
                                                Document type
                                            </MDTypography>
                                            <MDInput
                                                variant="standard"
                                                value={docType}
                                                onChange={(e) => setDocType(e.target.value)}
                                                placeholder="e.g. PDD, Validation, Audit, Registry Listing"
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <MDTypography variant="button" color="text" display="block" mb={1}>
                                                Files (max 10MB per file)
                                            </MDTypography>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleDocFilesChange}
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                                            />
                                        </Grid>
                                    </Grid>
                                </MDBox>

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
                            </Grid>

                            {/* Actions */}
                            <Grid item xs={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                <MDButton
                                    variant="text"
                                    color="secondary"
                                    onClick={() => navigate("/my-companies")}
                                    disabled={busy}
                                >
                                    Cancel
                                </MDButton>
                                <MDButton variant="gradient" color="info" type="submit" disabled={busy}>
                                    {submitting ? "Saving..." : uploadingMedia || uploadingDocs ? "Uploading..." : "Create Company"}
                                </MDButton>
                            </Grid>
                        </Grid>
                    </MDBox>
                </Card>
            </MDBox>

            <Footer />
        </DashboardLayout>
    );
}

export default CreateCompany;