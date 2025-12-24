import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Pagination from "@mui/material/Pagination";
import MenuItem from "@mui/material/MenuItem";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import DirectoryCompanyCard from "layouts/companies/directoryCompanyCard";

const API = process.env.REACT_APP_API;

function buildQS(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v).trim();
        if (!s) return;
        usp.set(k, s);
    });
    const qs = usp.toString();
    return qs ? `?${qs}` : "";
}

async function fetchMyCompanies({ page, pageSize, q }) {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(
        `${API}/companies/mycompanies${buildQS({ page, pageSize, q })}`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (res.status === 401) {
        sessionStorage.removeItem("token");
        window.location.href = "/sign-in";
        return null;
    }

    if (!res.ok) throw new Error("Failed to load companies");
    return res.json(); // { items, total, page, pageSize }
}

function AllCompanies() {
    const [companies, setCompanies] = useState([]);
    const [total, setTotal] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [qInput, setQInput] = useState("");
    const [q, setQ] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // debounce search input -> q (server query)
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setQ(qInput.trim());
        }, 350);
        return () => clearTimeout(t);
    }, [qInput]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        const load = async () => {
            try {
                const data = await fetchMyCompanies({ page, pageSize, q });
                if (!active || !data) return;

                setCompanies(Array.isArray(data.items) ? data.items : []);
                setTotal(Number(data.total ?? 0));

                // keep local state consistent if backend clamps values
                if (typeof data.page === "number" && data.page !== page) setPage(data.page);
                if (typeof data.pageSize === "number" && data.pageSize !== pageSize) setPageSize(data.pageSize);
            } catch (err) {
                if (!active) return;
                setError(err?.message || "Failed to load companies");
                setCompanies([]);
                setTotal(0);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [page, pageSize, q]);

    const totalPages = useMemo(() => {
        const ps = Math.max(1, Number(pageSize) || 10);
        return Math.max(1, Math.ceil((Number(total) || 0) / ps));
    }, [total, pageSize]);

    const hasCompanies = !loading && !error && companies.length > 0;

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={3} pb={3}>
                <Card>
                    {/* Header row */}
                    <MDBox p={3} pb={2}>
                        <MDBox
                            display="flex"
                            flexDirection={{ xs: "column", md: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", md: "center" }}
                            gap={2}
                        >
                            <MDBox>
                                <MDTypography variant="h5" fontWeight="medium">
                                    My Companies
                                </MDTypography>
                                <MDTypography variant="button" color="text">
                                    Companies you manage on this platform.
                                </MDTypography>
                            </MDBox>

                            <MDBox display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    component={Link}
                                    to="/companies/new"
                                >
                                    <Icon>add</Icon>&nbsp;Add New
                                </MDButton>
                            </MDBox>
                        </MDBox>

                        {/* Search + page size */}
                        <MDBox mt={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
                            <TextField
                                size="small"
                                placeholder="Search name or email…"
                                value={qInput}
                                onChange={(e) => setQInput(e.target.value)}
                                sx={{ minWidth: 280 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Icon fontSize="small">search</Icon>
                                        </InputAdornment>
                                    ),
                                    endAdornment: qInput ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                aria-label="Clear search"
                                                onClick={() => setQInput("")}
                                            >
                                                <Icon fontSize="small">close</Icon>
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                }}
                            />

                            <TextField
                                select
                                size="small"
                                label="Page size"
                                value={pageSize}
                                onChange={(e) => {
                                    setPage(1);
                                    setPageSize(Number(e.target.value));
                                }}
                                sx={{ width: 140 }}
                            >
                                {[10, 20, 50, 100].map((n) => (
                                    <MenuItem key={n} value={n}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <MDBox flex="1" />

                            {!loading && !error && (
                                <MDTypography variant="button" color="text">
                                    {total.toLocaleString()} result{total === 1 ? "" : "s"}
                                </MDTypography>
                            )}
                        </MDBox>
                    </MDBox>

                    {/* Content */}
                    <MDBox px={3} pb={3}>
                        {loading && (
                            <MDTypography variant="button" color="text">
                                Loading companies…
                            </MDTypography>
                        )}

                        {error && !loading && (
                            <MDTypography variant="button" color="error">
                                {error}
                            </MDTypography>
                        )}

                        {!loading && !error && !hasCompanies && (
                            <MDBox
                                py={6}
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                                justifyContent="center"
                                textAlign="center"
                            >
                                <Icon fontSize="large" sx={{ mb: 1 }}>
                                    business
                                </Icon>
                                <MDTypography variant="h6" fontWeight="medium" gutterBottom>
                                    No companies found
                                </MDTypography>
                                <MDTypography variant="body2" color="text" mb={2}>
                                    {q ? "Try a different search." : "You haven’t created any companies yet."}
                                </MDTypography>
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    component={Link}
                                    to="/companies/new"
                                >
                                    <Icon>add</Icon>&nbsp;Create Company
                                </MDButton>
                            </MDBox>
                        )}

                        {hasCompanies && (
                            <>
                                <Grid container spacing={3}>
                                    {companies.map((company) => (
                                        <Grid key={company.id} item xs={12} sm={12} md={6}>
                                            <DirectoryCompanyCard company={company} />
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Pagination */}
                                <MDBox
                                    mt={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    flexWrap="wrap"
                                    gap={2}
                                >
                                    <MDTypography variant="button" color="text">
                                        Showing {companies.length} on page {page} of {totalPages}.
                                    </MDTypography>

                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(_, p) => setPage(p)}
                                        shape="rounded"
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

export default AllCompanies;