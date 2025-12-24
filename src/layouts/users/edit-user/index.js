import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
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

// Reuse same FormField
import FormField from "layouts/pages/account/components/FormField";

import { countries } from "constants/countries";

const API = process.env.REACT_APP_API;

const MAX_USER_MEDIA = 10;
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

function toArrayOrEmpty(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    return [];
}

export default function EditUserProfile() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        full_name: "",
        headline: "",
        job_title: "",
        company_id: "",
        org_name: "",

        country: "",
        city: "",
        timezone: "",
        role_type: "",

        expertise_tags: [],
        service_offerings: [],
        sectors: [],
        standards: [],
        languages: [],

        personal_website: "",
        linkedin_url: "",
        portfolio_url: "",

        contact_email: "",
        phone_number: "",
        is_public: true,
        show_phone: false,
        show_contact_email: false,

        bio: "",
    });

    const makeId = () => crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    const [mediaQueue, setMediaQueue] = useState([]);

    const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;
    const isLikelyImage = (file) => (file?.type || "").startsWith("image/");

    const validateAndNormalizeSelection = (files, existingQueue, remaining) => {
        const existingKeys = new Set(existingQueue.map((x) => fileKey(x.file)));
        const rejected = { tooBig: [], dupes: [], overLimit: 0 };
        const ok = [];

        for (const f of files) {
            if (f.size > MAX_SIZE_BYTES) {
                rejected.tooBig.push(f);
                continue;
            }
            if (existingKeys.has(fileKey(f))) {
                rejected.dupes.push(f);
                continue;
            }
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

    const enqueueMedia = (items) => {
        const normalized = (items || []).map((x) => {
            if (x && typeof x === "object" && x.file instanceof File) {
                return { file: x.file, isAvatar: !!x.isAvatar };
            }
            return { file: x, isAvatar: false };
        });

        setMediaQueue((prev) => [
            ...prev,
            ...normalized.map(({ file, isAvatar }) => ({
                id: makeId(),
                file,
                isAvatar,
                previewUrl: isLikelyImage(file) ? URL.createObjectURL(file) : null,
                status: "queued",
                progress: 0,
                error: null,
            })),
        ]);
    };

    const removeFromQueue = (id) => {
        setMediaQueue((prev) => {
            const target = prev.find((x) => x.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((x) => x.id !== id);
        });
    };

    const setAvatarInQueue = (targetId) => {
        setMediaQueue((prev) => prev.map((x) => ({ ...x, isAvatar: x.id === targetId })));
    };

    useEffect(() => {
        return () => {
            for (const x of mediaQueue) if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mediaRemaining = MAX_USER_MEDIA - mediaQueue.filter((x) => x.status !== "done").length;
    const visibleMediaQueue = mediaQueue.filter((x) => x.status !== "done");

    const [submitting, setSubmitting] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const token = useMemo(() => sessionStorage.getItem("token"), []);
    const authHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`${API}/users/me/profile`, { headers: authHeaders });
                if (!res.ok) return;

                const existing = await res.json();
                if (!existing || cancelled) return;

                setForm((prev) => ({
                    ...prev,
                    full_name: existing.full_name || "",
                    headline: existing.headline || "",
                    job_title: existing.job_title || "",
                    company_id: existing.company_id || "",
                    org_name: existing.org_name || "",

                    country: existing.country || "",
                    city: existing.city || "",
                    timezone: existing.timezone || "",
                    role_type: existing.role_type || "",

                    expertise_tags: existing.expertise_tags || [],
                    service_offerings: existing.service_offerings || [],
                    sectors: existing.sectors || [],
                    standards: existing.standards || [],
                    languages: existing.languages || [],

                    personal_website: existing.personal_website || "",
                    linkedin_url: existing.linkedin_url || "",
                    portfolio_url: existing.portfolio_url || "",

                    contact_email: existing.contact_email || "",
                    phone_number: existing.phone_number || "",
                    is_public: !!existing.is_public,
                    show_phone: !!existing.show_phone,
                    show_contact_email: !!existing.show_contact_email,

                    bio: existing.bio || "",
                }));
            } catch {
                // ignore; treat as new profile
            }
        })();

        return () => { cancelled = true; };
    }, [authHeaders]);

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSwitch = (field) => (_, checked) => {
        setForm((prev) => ({ ...prev, [field]: checked }));
    };

    const handleMediaFilesChange = (event) => {
        const files = Array.from(event.target.files || []);
        const { picked, rejected } = validateAndNormalizeSelection(files, mediaQueue, mediaRemaining);

        const msg = formatRejectionMsg(rejected);
        if (msg) alert(msg);

        if (picked.length) {
            // if nothing is avatar yet, make the first picked file avatar by default
            const hasAvatarQueued = mediaQueue.some((x) => x.isAvatar);
            enqueueMedia(
                picked.map((file, idx) => ({ file, isAvatar: !hasAvatarQueued && idx === 0 }))
            );
        }
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

    const uploadMediaAfterProfileSave = async () => {
        const items = mediaQueue.filter((x) => x.status === "queued" || x.status === "error");
        if (!items.length) return;

        setUploadingMedia(true);
        try {
            for (const item of items) {
                try {
                    const file = item.file;
                    const fileExt = getFileExt(file.name);
                    const contentType = file.type || "application/octet-stream";

                    setMediaQueue((prev) =>
                        prev.map((x) =>
                            x.id === item.id ? { ...x, status: "uploading", progress: 1, error: null } : x
                        )
                    );

                    const uRes = await fetch(`${API}/users/me/media/upload-url`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ fileExt, contentType }),
                    });
                    if (!uRes.ok) throw new Error("Failed to get media upload URL.");

                    const { uploadUrl, key, asset_url } = await uRes.json();
                    await uploadViaPresignedPut({ uploadUrl, file });

                    setMediaQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: 80 } : x)));

                    const createRes = await fetch(`${API}/users/me/media`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                            s3_key: key,
                            asset_url, // optional; backend accepts asset_url or s3_key
                            content_type: contentType,
                            kind: "image",
                            metadata: { original_name: file.name, size: file.size },
                            is_avatar: item.isAvatar === true,
                        }),
                    });
                    if (!createRes.ok) throw new Error("Failed to save media metadata.");

                    setMediaQueue((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x))
                    );
                } catch (e) {
                    setMediaQueue((prev) =>
                        prev.map((x) =>
                            x.id === item.id
                                ? { ...x, status: "error", error: e?.message || "Upload failed" }
                                : x
                        )
                    );
                }
            }
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.full_name.trim()) return alert("Full name is required.");
        if (!form.headline.trim()) return alert("Headline is required.");

        const payload = {
            full_name: form.full_name.trim(),
            headline: form.headline.trim(),
            job_title: form.job_title?.trim() || null,
            company_id: form.company_id?.trim() || null,
            org_name: form.org_name?.trim() || null,

            country: form.country?.trim() || null,
            city: form.city?.trim() || null,
            timezone: form.timezone?.trim() || null,
            role_type: form.role_type?.trim() || null,

            expertise_tags: toArrayOrEmpty(form.expertise_tags),
            service_offerings: toArrayOrEmpty(form.service_offerings),
            sectors: toArrayOrEmpty(form.sectors),
            standards: toArrayOrEmpty(form.standards),
            languages: toArrayOrEmpty(form.languages),

            personal_website: form.personal_website?.trim() || null,
            linkedin_url: form.linkedin_url?.trim() || null,
            portfolio_url: form.portfolio_url?.trim() || null,

            contact_email: form.contact_email?.trim() || null,
            phone_number: form.phone_number?.trim() || null,
            is_public: !!form.is_public,
            show_phone: !!form.show_phone,
            show_contact_email: !!form.show_contact_email,

            bio: form.bio?.trim() || null,
        };

        setSubmitting(true);
        try {
            const res = await fetch(`${API}/users/me/profile`, {
                method: "PATCH",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errBody = await readJsonSafe(res);
                console.error("Save profile error", errBody);
                alert("Failed to save profile.");
                return;
            }

            // profile saved, then upload queued media (avatar + other images)
            if (mediaQueue.some((x) => x.status === "queued" || x.status === "error")) {
                await uploadMediaAfterProfileSave();
            }

            navigate("/directory?tab=users"); // change to your desired destination
        } catch (err) {
            console.error("Save profile error", err);
            alert(err?.message || "Unexpected error when saving profile.");
        } finally {
            setSubmitting(false);
        }
    };

    const busy = submitting || uploadingMedia;

    return (
        <DashboardLayout>
            <MDBox width="calc(100% - 48px)" position="absolute" top="1.75rem">
                <DashboardNavbar light absolute />
            </MDBox>

            <MDBox mt={10} mb={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3} pb={1}>
                        <MDTypography variant="h5">Create / Update Profile</MDTypography>
                        <MDTypography variant="button" color="text" display="block" mt={0.5}>
                            Build your directory profile and upload an avatar.
                        </MDTypography>
                    </MDBox>

                    <MDBox component="form" pb={3} px={3} pt={2} onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            {/* Basics */}
                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Full name *"
                                    placeholder="Your name"
                                    value={form.full_name}
                                    onChange={handleChange("full_name")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Headline *"
                                    placeholder="One-line positioning"
                                    value={form.headline}
                                    onChange={handleChange("headline")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Job title"
                                    placeholder="e.g. Carbon Consultant"
                                    value={form.job_title}
                                    onChange={handleChange("job_title")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Company ID (optional)"
                                    placeholder="UUID (optional)"
                                    value={form.company_id}
                                    onChange={handleChange("company_id")}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormField
                                    label="Organization name (fallback)"
                                    placeholder="Used when you don't link a company"
                                    value={form.org_name}
                                    onChange={handleChange("org_name")}
                                />
                            </Grid>

                            {/* Location */}
                            <Grid item xs={12} sm={6}>
                                <MDBox mb={3}>
                                    <MDBox mb={1.625} display="inline-block">
                                        <MDTypography component="label" variant="button" fontWeight="regular" color="text">
                                            Country
                                        </MDTypography>
                                    </MDBox>
                                    <Autocomplete
                                        options={countries.map((c) => c.name)}
                                        value={form.country || null}
                                        onChange={(_, newValue) => setForm((p) => ({ ...p, country: newValue || "" }))}
                                        renderInput={(params) => (
                                            <MDInput {...params} variant="standard" placeholder="Select country" />
                                        )}
                                    />
                                </MDBox>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="City"
                                    placeholder="City"
                                    value={form.city}
                                    onChange={handleChange("city")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Timezone"
                                    placeholder="e.g. Asia/Kuala_Lumpur"
                                    value={form.timezone}
                                    onChange={handleChange("timezone")}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Role type"
                                    placeholder="e.g. Developer, Consultant, Verifier"
                                    value={form.role_type}
                                    onChange={handleChange("role_type")}
                                />
                            </Grid>

                            {/* Tags */}
                            {[
                                ["expertise_tags", "Expertise tags"],
                                ["service_offerings", "Service offerings"],
                                ["sectors", "Sectors"],
                                ["standards", "Standards"],
                                ["languages", "Languages"],
                            ].map(([key, label]) => (
                                <Grid item xs={12} key={key}>
                                    <MDBox mb={1.625} display="inline-block">
                                        <MDTypography component="label" variant="button" fontWeight="regular" color="text">
                                            {label}
                                        </MDTypography>
                                    </MDBox>
                                    <Autocomplete
                                        multiple
                                        freeSolo
                                        options={[]}
                                        value={form[key]}
                                        onChange={(_, newValue) => setForm((p) => ({ ...p, [key]: newValue }))}
                                        renderInput={(params) => (
                                            <MDInput {...params} variant="standard" placeholder={`Add ${label.toLowerCase()}`} />
                                        )}
                                    />
                                </Grid>
                            ))}

                            {/* Links */}
                            <Grid item xs={12} sm={4}>
                                <FormField
                                    label="Website"
                                    placeholder="https://..."
                                    value={form.personal_website}
                                    onChange={handleChange("personal_website")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormField
                                    label="LinkedIn"
                                    placeholder="https://linkedin.com/in/..."
                                    value={form.linkedin_url}
                                    onChange={handleChange("linkedin_url")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormField
                                    label="Portfolio"
                                    placeholder="https://..."
                                    value={form.portfolio_url}
                                    onChange={handleChange("portfolio_url")}
                                />
                            </Grid>

                            {/* Contact + visibility */}
                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Contact email"
                                    placeholder="you@domain.com"
                                    value={form.contact_email}
                                    onChange={handleChange("contact_email")}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormField
                                    label="Phone number"
                                    placeholder="+60..."
                                    value={form.phone_number}
                                    onChange={handleChange("phone_number")}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <MDBox display="flex" flexWrap="wrap" gap={2}>
                                    <FormControlLabel
                                        control={<Switch checked={form.is_public} onChange={handleSwitch("is_public")} />}
                                        label="Public profile"
                                    />
                                    <FormControlLabel
                                        control={<Switch checked={form.show_contact_email} onChange={handleSwitch("show_contact_email")} />}
                                        label="Show contact email"
                                    />
                                    <FormControlLabel
                                        control={<Switch checked={form.show_phone} onChange={handleSwitch("show_phone")} />}
                                        label="Show phone"
                                    />
                                </MDBox>
                            </Grid>

                            <Grid item xs={12}>
                                <FormField
                                    label="Bio"
                                    placeholder="Tell people what you do and how you can help"
                                    multiline
                                    rows={4}
                                    value={form.bio}
                                    onChange={handleChange("bio")}
                                />
                            </Grid>

                            {/* Media (avatar + images) */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <MDTypography variant="h6" gutterBottom>
                                    Avatar & Photos
                                </MDTypography>

                                <MDBox mb={2}>
                                    <MDTypography variant="button" color="text" display="block" mb={1}>
                                        Upload images (max 10MB per file)
                                    </MDTypography>
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
                                                border: `1px solid ${x.isAvatar ? palette.info.main : "#eee"}`,
                                                backgroundColor: "#fafafa",
                                                display: "flex",
                                                flexDirection: "column",
                                            })}
                                        >
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
                                                    variant={x.isAvatar ? "contained" : "outlined"}
                                                    color="info"
                                                    disabled={x.status === "uploading"}
                                                    onClick={() => setAvatarInQueue(x.id)}
                                                    sx={{ py: 0.25, minWidth: 0 }}
                                                >
                                                    {x.isAvatar ? "Avatar" : "Set avatar"}
                                                </MDButton>

                                                <IconButton
                                                    size="small"
                                                    disabled={x.status === "uploading"}
                                                    onClick={() => removeFromQueue(x.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </MDBox>

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

                                            {x.status === "uploading" && (
                                                <MDBox sx={{ px: 1, pb: 1 }}>
                                                    <LinearProgress variant="determinate" value={x.progress || 0} />
                                                </MDBox>
                                            )}
                                        </MDBox>
                                    ))}
                                </MDBox>
                            </Grid>

                            {/* Actions */}
                            <Grid item xs={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                <MDButton variant="text" color="secondary" onClick={() => navigate(-1)} disabled={busy}>
                                    Cancel
                                </MDButton>
                                <MDButton variant="gradient" color="info" type="submit" disabled={busy}>
                                    {submitting ? "Saving..." : uploadingMedia ? "Uploading..." : "Save Profile"}
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