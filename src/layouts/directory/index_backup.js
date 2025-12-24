import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// TODO: replace with real data wired to your API
import dataTableData from "layouts/dashboards/sales/data/dataTableData";
// import projectDirectoryData from "./data/projectDirectoryData";

function Directory() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDTypography variant="h5" fontWeight="medium">
              Project Directory
            </MDTypography>
            <MDTypography variant="button" color="text">
              Browse carbon projects across registries, developers and geographies.
            </MDTypography>
          </MDBox>
          <DataTable
            table={dataTableData}
            canSearch
            entriesPerPage={{ defaultValue: 10, entries: [10, 25, 50] }}
          />
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Directory;