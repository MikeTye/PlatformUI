import PublicLayout from "layouts/public/layout/index";

import { useEffect, useMemo, useState } from "react";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Select from "@mui/material/Select";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DirectoryProjectCard from "layouts/projects/directoryProjectCard";
import DirectoryCompanyCard from "layouts/companies/directoryCompanyCard";
import DirectoryUserCard from "layouts/users/directoryUserCard";

const API = process.env.REACT_APP_API;

const PAGE_SIZE = 10;

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.json();
}

function buildQS(params) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "" || v === "all") return;
        qs.set(k, String(v));
    });
    return qs.toString();
}

async function fetchPaged(path, params) {
    const qs = buildQS(params);
    const data = await fetchJson(`${API}${path}${qs ? `?${qs}` : ""}`);

    return {
        items: Array.isArray(data?.items) ? data.items : [],
        total: Number(data?.total ?? 0),
        page: Number(data?.page ?? params?.page ?? 1),
        pageSize: Number(data?.pageSize ?? params?.pageSize ?? PAGE_SIZE),
    };
}

// PUBLIC-SAFE CONFIG – use /public/* endpoints and only pass “safe” fields into cards
const TYPE_CONFIG = {
    projects: {
        label: "Projects",
        categoryLabel: null,
        // <- make sure backend /public/projects only returns public projects/fields
        fetcher: (params) => fetchPaged("/projects", params),
        renderCard: (item) => (
            <DirectoryProjectCard
                id={item.id}
                coverAssetUrl={item.cover_asset_url || item.asset_url}
                name={item.name}
                description={item.description}
                projectType={item.project_type}
                status={item.status}
                sector={item.sector}
                hostCountry={item.host_country}
                hostRegion={item.host_region}
                registrationPlatform={item.registration_platform}
                // PUBLIC route
                to={`/public/projects/${item.id}`}
            />
        ),
    },

    companies: {
        label: "Companies",
        categoryLabel: "Sector",
        // <- public companies endpoint, filtered server-side
        fetcher: (params) => fetchPaged("/companies", params),
        renderCard: (item) => <DirectoryCompanyCard company={item} to={`/public/companies/${item.id}`} />,
        getCategory: (c) => c.sector,
    },

    users: {
        label: "Users",
        categoryLabel: "Role",
        // <- public users endpoint; make sure backend strips private fields (emails, phone, etc)
        fetcher: (params) => fetchPaged("/users", params),
        // pass only the user object; card should decide what to show publicly
        renderCard: (item) => <DirectoryUserCard user={item} to={`/public/users/${item.user_id}`} />,
        getCategory: (u) => u.role_type,
    },
};

function PublicDirectory() {
    const [activeType, setActiveType] = useState("projects");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState("");
    const [searchApplied, setSearchApplied] = useState("");

    const [categoryFilter, setCategoryFilter] = useState("all");

    const [projectTypeFilter, setProjectTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const [page, setPage] = useState(1);

    const [pageData, setPageData] = useState({
        items: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
    });

    const handleSearchSubmit = () => {
        setPage(1);
        setSearchApplied(searchInput.trim());
    };

    // reset paging + relevant filters on type change
    useEffect(() => {
        setPage(1);
        setCategoryFilter("all");

        if (activeType !== "projects") {
            setProjectTypeFilter("all");
            setStatusFilter("all");
        }
    }, [activeType]);

    // server-side fetch for ALL tabs (matches private directory logic)
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const base = {
                    page,
                    pageSize: PAGE_SIZE,
                    q: searchApplied || undefined,
                };

                let params = base;

                if (activeType === "projects") {
                    params = {
                        ...base,
                        projectType: projectTypeFilter !== "all" ? projectTypeFilter : undefined,
                        status: statusFilter !== "all" ? statusFilter : undefined,
                    };
                } else if (activeType === "companies") {
                    params = {
                        ...base,
                        sector: categoryFilter !== "all" ? categoryFilter : undefined,
                    };
                } else if (activeType === "users") {
                    params = {
                        ...base,
                        roleType: categoryFilter !== "all" ? categoryFilter : undefined,
                    };
                }

                const data = await TYPE_CONFIG[activeType].fetcher(params);
                if (!active) return;

                setPageData(data);
            } catch (e) {
                if (!active) return;
                setError(e?.message || "Unexpected error");
                setPageData({ items: [], total: 0, page, pageSize: PAGE_SIZE });
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [activeType, page, searchApplied, categoryFilter, projectTypeFilter, statusFilter]);

    const typeLabel = TYPE_CONFIG[activeType]?.label || "Directory";
    const categoryLabel = TYPE_CONFIG[activeType]?.categoryLabel || "Category";

    // Build dropdown options from current page (no extra API)
    const categoryOptions = useMemo(() => {
        if (activeType === "projects") return ["all"];
        const getCategory = TYPE_CONFIG[activeType]?.getCategory;
        const set = new Set();
        (pageData.items || []).forEach((it) => {
            const c = getCategory?.(it);
            if (c) set.add(c);
        });
        return ["all", ...Array.from(set)];
    }, [activeType, pageData.items]);

    const total = Number(pageData.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const filterSx = {
        height: 42,
        ".MuiSelect-select": { display: "flex", alignItems: "center" },
    };

    const handleCategoryChange = (e) => {
        setCategoryFilter(e.target.value);
        setPage(1);
    };

    const handlePageChange = (_event, value) => setPage(value);

    return (
        <PublicLayout title="Directory">
            <MDBox pt={3} pb={3}>
                <Card>
                    <MDBox p={3} lineHeight={1}>
                        <MDTypography variant="h5" fontWeight="medium">
                            {typeLabel}
                        </MDTypography>
                        <MDTypography variant="button" color="text">
                            Browse, search, and filter.
                        </MDTypography>
                    </MDBox>

                    {/* Controls */}
                    <MDBox px={3} pb={2}>
                        <MDBox
                            display="flex"
                            flexDirection={{ xs: "column", md: "row" }}
                            gap={2}
                            justifyContent="space-between"
                            alignItems={{ xs: "stretch", md: "center" }}
                        >
                            <ToggleButtonGroup
                                value={activeType}
                                exclusive
                                onChange={(_e, v) => v && setActiveType(v)}
                                sx={{
                                    borderRadius: 3,
                                    overflow: "hidden",
                                    bgcolor: "#f5f6fa",
                                    "& .MuiToggleButton-root": {
                                        px: 2.5,
                                        py: 1.2,
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.9rem",
                                        border: "none",
                                        color: "#6b7280",
                                        "&.Mui-selected": {
                                            bgcolor: "#111827",
                                            color: "#fff",
                                            "&:hover": { bgcolor: "#0f172a" },
                                        },
                                        "&:hover": {
                                            bgcolor: "#e5e7eb",
                                        },
                                    },
                                }}
                            >
                                <ToggleButton value="projects">Projects</ToggleButton>
                                <ToggleButton value="companies">Companies</ToggleButton>
                                <ToggleButton value="users">Users</ToggleButton>
                            </ToggleButtonGroup>

                            <MDBox display="flex" gap={1} flex={1} justifyContent="flex-end">
                                <MDInput
                                    placeholder={`Search ${activeType}`}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                                    fullWidth
                                    sx={{ "& .MuiInputBase-root": { height: 42 } }}
                                />
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    sx={{ height: 42 }}
                                    onClick={handleSearchSubmit}
                                >
                                    Search
                                </MDButton>
                            </MDBox>

                            {activeType === "projects" ? (
                                <MDBox display="flex" gap={1} mb={{ xs: 1, md: 0 }}>
                                    <Select
                                        size="small"
                                        value={projectTypeFilter}
                                        onChange={(e) => {
                                            setProjectTypeFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        sx={filterSx}
                                    >
                                        <MenuItem value="all">All types</MenuItem>
                                        {/* TODO: swap to your real enum values */}
                                        <MenuItem value="nature">Nature</MenuItem>
                                        <MenuItem value="tech">Tech</MenuItem>
                                    </Select>

                                    <Select
                                        size="small"
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        sx={filterSx}
                                    >
                                        <MenuItem value="all">All statuses</MenuItem>
                                        {/* TODO: swap to your real enum values */}
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                    </Select>
                                </MDBox>
                            ) : (
                                <MDBox display="flex" gap={2} width={{ xs: "100%", md: "auto" }}>
                                    {/* <TextField
                                        select
                                        size="small"
                                        label={categoryLabel}
                                        value={categoryFilter}
                                        onChange={handleCategoryChange}
                                        sx={{ ...filterSx, minWidth: { xs: 140, md: 180 } }}
                                    >
                                        {categoryOptions.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c === "all" ? "All" : c}
                                            </MenuItem>
                                        ))}
                                    </TextField> */}
                                </MDBox>
                            )}
                        </MDBox>
                    </MDBox>

                    {/* Grid */}
                    <MDBox px={3} pb={3}>
                        {loading && (
                            <MDTypography variant="button" color="text">
                                Loading…
                            </MDTypography>
                        )}

                        {!loading && error && (
                            <MDTypography variant="button" color="error">
                                {error}
                            </MDTypography>
                        )}

                        {!loading && !error && (
                            <>
                                <Grid container spacing={3}>
                                    {(pageData.items || []).map((it) => (
                                        <Grid key={`${activeType}:${it.id}`} item xs={12} sm={6}>
                                            {TYPE_CONFIG[activeType].renderCard(it)}
                                        </Grid>
                                    ))}
                                </Grid>

                                <MDBox
                                    mt={3}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    rowGap={1.5}
                                >
                                    <MDTypography variant="button" color="text">
                                        {total === 0
                                            ? "No results found"
                                            : `Showing page ${currentPage} of ${totalPages} (${total} total)`}
                                    </MDTypography>

                                    <Pagination
                                        count={totalPages}
                                        page={currentPage}
                                        onChange={handlePageChange}
                                        shape="rounded"
                                        size="small"
                                    />
                                </MDBox>
                            </>
                        )}
                    </MDBox>
                </Card>
            </MDBox>
        </PublicLayout>
    );
}

export default PublicDirectory;