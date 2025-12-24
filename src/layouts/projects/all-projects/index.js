import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import DirectoryProjectCard from "layouts/projects/directoryProjectCard";

const API = process.env.REACT_APP_API;

async function fetchMyProjects() {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API}/projects/myprojects`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        sessionStorage.removeItem("token");
        window.location.href = "/sign-in"; // or your login route
        return;
    }

    if (!res.ok) throw new Error("Failed to load projects");
    return res.json();
}


function AllProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = await fetchMyProjects();
                if (!active) return;

                const baseProjects = Array.isArray(data) ? data : data.items || [];

                setProjects(baseProjects);
            } catch (err) {
                if (!active) return;
                setError(err.message || "Failed to load projects");
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, []);

    const hasProjects = !loading && !error && projects.length > 0;

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={3} pb={3}>
                <Card>
                    {/* Header row with title + Add New */}
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
                                    My Projects
                                </MDTypography>
                                <MDTypography variant="button" color="text">
                                    Projects you manage on this platform.
                                </MDTypography>
                            </MDBox>

                            <MDButton
                                variant="gradient"
                                color="info"
                                component={Link}
                                to="/projects/new"
                            >
                                <Icon>add</Icon>&nbsp;Add New
                            </MDButton>
                        </MDBox>
                    </MDBox>

                    {/* Content */}
                    <MDBox px={3} pb={3}>
                        {loading && (
                            <MDTypography variant="button" color="text">
                                Loading projects…
                            </MDTypography>
                        )}

                        {error && !loading && (
                            <MDTypography variant="button" color="error">
                                {error}
                            </MDTypography>
                        )}

                        {!loading && !error && !hasProjects && (
                            <MDBox
                                py={6}
                                display="flex"
                                flexDirection="column"
                                alignItems="center"
                                justifyContent="center"
                                textAlign="center"
                            >
                                <Icon fontSize="large" sx={{ mb: 1 }}>
                                    assignment
                                </Icon>
                                <MDTypography variant="h6" fontWeight="medium" gutterBottom>
                                    No projects yet
                                </MDTypography>
                                <MDTypography variant="body2" color="text" mb={2}>
                                    You haven&apos;t created any projects. Start by adding your first one.
                                </MDTypography>
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    component={Link}
                                    to="/projects/new"
                                >
                                    <Icon>add</Icon>&nbsp;Create Project
                                </MDButton>
                            </MDBox>
                        )}

                        {hasProjects && (
                            <>
                                <Grid container spacing={3}>
                                    {projects.map((project) => (
                                        <Grid key={project.id} item xs={12} sm={12} md={6}>
                                            <DirectoryProjectCard
                                                id={project.id}
                                                name={project.name}
                                                description={project.description}
                                                projectType={project.project_type}
                                                status={project.status}
                                                sector={project.sector}
                                                hostCountry={project.host_country}
                                                hostRegion={project.host_region}
                                                registrationPlatform={project.registration_platform}
                                                coverAssetUrl={project.cover_asset_url || project.coverAssetUrl}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>

                                <MDBox mt={3}>
                                    <MDTypography variant="button" color="text">
                                        Showing {projects.length} project
                                        {projects.length === 1 ? "" : "s"}.
                                    </MDTypography>
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

export default AllProjects;