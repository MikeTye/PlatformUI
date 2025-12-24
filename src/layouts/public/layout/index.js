import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useNavigate } from "react-router-dom";

export default function PublicLayout({ title, children }) {
    const navigate = useNavigate();

    return (
        <MDBox minHeight="100vh" display="flex" flexDirection="column">
            {/* simple top bar */}
            <MDBox
                px={3}
                py={2}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                borderBottom="1px solid rgba(0,0,0,0.08)"
            >
                <MDTypography variant="h6" fontWeight="bold" sx={{ cursor: "pointer" }} onClick={() => navigate("/directory")}>
                    The Carbon Economy
                </MDTypography>

                <MDButton variant="outlined" color="info" size="small" onClick={() => navigate("/authentication/sign-in/illustration")}>
                    Sign in
                </MDButton>
            </MDBox>

            {/* content */}
            <MDBox flex={1} px={3} py={3}>
                {title ? (
                    <MDTypography variant="h4" fontWeight="medium" mb={2}>
                        {title}
                    </MDTypography>
                ) : null}
                {children}
            </MDBox>

            {/* footer */}
            <MDBox px={3} py={2} opacity={0.7}>
                <MDTypography variant="caption">© {new Date().getFullYear()} The Carbon Economy</MDTypography>
            </MDBox>
        </MDBox>
    );
}

PublicLayout.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
};