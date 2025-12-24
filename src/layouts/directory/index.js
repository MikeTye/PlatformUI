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

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import DirectoryProjectCard from "layouts/projects/directoryProjectCard";
import DirectoryCompanyCard from "layouts/companies/directoryCompanyCard";
import DirectoryUserCard from "layouts/users/directoryUserCard";

const API = process.env.REACT_APP_API;

// hardcode page size (you said remove items-per-page control)
const PAGE_SIZE = 12;

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.json();
}

function unwrapList(data) {
    // endpoints might return array or {items:[...]} or {companies:[...]} etc
    return Array.isArray(data) ? data : data?.items || data?.companies || data?.users || [];
}

async function fetchProjectsPaged(params) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "" || v === "all") return;
        qs.set(k, String(v));
    });

    const data = await fetchJson(`${API}/projects?${qs.toString()}`);

    // backend: { items, total, page, pageSize }
    return {
        items: data?.items || [],
        total: Number(data?.total || 0),
        page: Number(data?.page || params?.page || 1),
        pageSize: Number(data?.pageSize || params?.pageSize || PAGE_SIZE),
    };
}

async function fetchCompanies() {
    const data = await fetchJson(`${API}/companies`);
    return unwrapList(data);
}

async function fetchUsers() {
    const data = await fetchJson(`${API}/users`);
    return unwrapList(data);
}

const TYPE_CONFIG = {
    projects: {
        label: "Projects",
        fetcher: fetchProjectsPaged,
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
                to={`/projects/${item.id}`}
            />
        ),
        haystack: (p) =>
            [
                p.name,
                p.description,
                p.project_type,
                p.sector,
                p.status,
                p.host_country,
                p.host_region,
                p.registration_platform,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
    },

    companies: {
        label: "Companies",
        fetcher: fetchCompanies,
        categoryLabel: "Sector",
        getCategory: (c) => c.sector,
        haystack: (c) =>
            [
                c.legal_name || c.legalName || c.name,
                c.function_description,
                c.functionDescription,
                c.sector,
                c.country,
                c.host_country,
                c.business_function,
                c.website_url,
                c.company_email,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
        renderCard: (item) => <DirectoryCompanyCard company={item} />,
    },

    users: {
        label: "Users",
        fetcher: fetchUsers,
        categoryLabel: "Role",
        getCategory: (u) => u.role_type,
        haystack: (u) =>
            [
                u.full_name,
                u.headline,
                u.job_title,
                u.org_display_name,
                u.country,
                u.city,
                u.role_type,
                ...(u.expertise_tags || []),
                ...(u.sectors || []),
                ...(u.standards || []),
                ...(u.languages || []),
                u.bio,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
        renderCard: (item) => <DirectoryUserCard user={item} />,
    },
};

function Directory() {
    const [activeType, setActiveType] = useState("projects"); // "projects" | "companies" | "users"
    const [itemsByType, setItemsByType] = useState({ projects: [], companies: [], users: [] });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // shared search (submit-based)
    const [searchInput, setSearchInput] = useState("");
    const [searchApplied, setSearchApplied] = useState("");

    // companies/users category filter (client-side)
    const [categoryFilter, setCategoryFilter] = useState("all");

    // project-specific filters (server-side)
    const [projectTypeFilter, setProjectTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const [page, setPage] = useState(1);

    const handleSearchSubmit = () => {
        setPage(1);
        setSearchApplied(searchInput.trim());
    };

    const [projectPage, setProjectPage] = useState({
        items: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
    });
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectsError, setProjectsError] = useState(null);

    // Load companies + users once (projects are paged server-side)
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const [companies, users] = await Promise.all([
                    TYPE_CONFIG.companies.fetcher().catch(() => []),
                    TYPE_CONFIG.users.fetcher().catch(() => []),
                ]);

                if (!active) return;
                setItemsByType({ projects: [], companies, users });
            } catch (e) {
                if (!active) return;
                setError(e?.message || "Unexpected error");
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    // Fetch projects whenever projects tab / page / filters / applied search changes
    useEffect(() => {
        if (activeType !== "projects") return;

        let active = true;

        (async () => {
            try {
                setProjectsLoading(true);
                setProjectsError(null);

                const data = await fetchProjectsPaged({
                    page,
                    pageSize: PAGE_SIZE,
                    q: searchApplied || undefined,
                    projectType: projectTypeFilter !== "all" ? projectTypeFilter : undefined,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                });

                if (!active) return;
                setProjectPage(data);
            } catch (e) {
                if (!active) return;
                setProjectsError(e?.message || "Failed to load projects");
                setProjectPage({ items: [], total: 0, page, pageSize: PAGE_SIZE });
            } finally {
                if (active) setProjectsLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [activeType, page, searchApplied, projectTypeFilter, statusFilter]);

    // Reset paging/filters when switching types
    useEffect(() => {
        setPage(1);
        setCategoryFilter("all");

        // optional: reset project filters when leaving/entering projects
        if (activeType !== "projects") {
            setProjectTypeFilter("all");
            setStatusFilter("all");
        }
    }, [activeType]);

    // client-side filtered list for companies/users only
    const clientSideItems = useMemo(() => {
        const raw = itemsByType[activeType] || [];
        const cfg = TYPE_CONFIG[activeType];
        const q = searchApplied.trim().toLowerCase();

        return raw.filter((it) => {
            if (activeType !== "projects" && categoryFilter !== "all" && cfg?.getCategory) {
                if (cfg.getCategory(it) !== categoryFilter) return false;
            }
            if (!q) return true;
            return cfg?.haystack ? cfg.haystack(it).includes(q) : true;
        });
    }, [itemsByType, activeType, searchApplied, categoryFilter]);

    const isProjects = activeType === "projects";

    const viewLoading = isProjects ? projectsLoading : loading;
    const viewError = isProjects ? projectsError : error;

    const viewTotal = isProjects ? projectPage.total : clientSideItems.length;
    const viewPageSize = PAGE_SIZE;
    const viewTotalPages = Math.max(1, Math.ceil(viewTotal / viewPageSize));
    const viewCurrentPage = Math.min(page, viewTotalPages);

    const viewStartIndex = (viewCurrentPage - 1) * viewPageSize;
    const viewEndIndex = Math.min(viewStartIndex + viewPageSize, viewTotal);

    const viewItems = isProjects
        ? projectPage.items.map((x) => ({ __type: "projects", ...x }))
        : clientSideItems
            .slice(viewStartIndex, viewStartIndex + viewPageSize)
            .map((x) => ({ __type: activeType, ...x }));

    const handleCategoryChange = (e) => {
        setCategoryFilter(e.target.value);
        setPage(1);
    };

    const handlePageChange = (_event, value) => setPage(value);

    const typeLabel = TYPE_CONFIG[activeType]?.label || "Directory";
    const categoryLabel = TYPE_CONFIG[activeType]?.categoryLabel || "Category";

    const categoryOptions = useMemo(() => {
        if (activeType === "projects") return ["all"]; // not used (hidden)
        const cfg = TYPE_CONFIG[activeType];
        const set = new Set();
        (itemsByType[activeType] || []).forEach((it) => {
            const c = cfg.getCategory?.(it);
            if (c) set.add(c);
        });
        return ["all", ...Array.from(set)];
    }, [itemsByType, activeType]);

    return (
        <DashboardLayout>
            <DashboardNavbar />
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
                                size="small"
                                value={activeType}
                                exclusive
                                onChange={(_e, v) => v && setActiveType(v)}
                                sx={{ flexWrap: "wrap" }}
                            >
                                <ToggleButton value="projects">Projects</ToggleButton>
                                <ToggleButton value="companies">Companies</ToggleButton>
                                <ToggleButton value="users">Users</ToggleButton>
                            </ToggleButtonGroup>

                            <MDBox display="flex" gap={1} mb={{ xs: 1, md: 0 }} flex={1} justifyContent="flex-end">
                                <MDInput
                                    placeholder={`Search ${activeType}`}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                                    fullWidth
                                />
                                <MDButton variant="gradient" color="info" onClick={handleSearchSubmit}>
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
                                    >
                                        <MenuItem value="all">All types</MenuItem>
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
                                    >
                                        <MenuItem value="all">All statuses</MenuItem>
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                    </Select>
                                </MDBox>
                            ) : (
                                <MDBox display="flex" gap={2} width={{ xs: "100%", md: "auto" }}>
                                    <TextField
                                        select
                                        size="small"
                                        label={categoryLabel}
                                        value={categoryFilter}
                                        onChange={handleCategoryChange}
                                        sx={{ flex: 1, minWidth: { xs: 140, md: 180 } }}
                                    >
                                        {categoryOptions.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c === "all" ? "All" : c}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </MDBox>
                            )}
                        </MDBox>
                    </MDBox>

                    {/* Grid */}
                    <MDBox px={3} pb={3}>
                        {viewLoading && (
                            <MDTypography variant="button" color="text">
                                Loading…
                            </MDTypography>
                        )}

                        {!viewLoading && viewError && (
                            <MDTypography variant="button" color="error">
                                {viewError}
                            </MDTypography>
                        )}

                        {!viewLoading && !viewError && (
                            <>
                                <Grid container spacing={3}>
                                    {viewItems.map((it) => (
                                        <Grid key={`${it.__type}:${it.id}`} item xs={12} sm={6}>
                                            {TYPE_CONFIG[it.__type].renderCard(it)}
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
                                        {viewTotal === 0
                                            ? "No results found"
                                            : `Showing ${viewStartIndex + 1}-${viewEndIndex} of ${viewTotal}`}
                                    </MDTypography>

                                    <Pagination
                                        count={viewTotalPages}
                                        page={viewCurrentPage}
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
            <Footer />
        </DashboardLayout>
    );
}

export default Directory;