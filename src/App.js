import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";

// Material Dashboard 3 PRO React examples
import Sidenav from "examples/Sidenav";
// import Configurator from "examples/Configurator";

// Material Dashboard 3 PRO React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Material Dashboard 3 PRO React Dark Mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Material Dashboard 3 PRO React routes
import routes from "routes";

// Material Dashboard 3 PRO React contexts
import {
    useMaterialUIController,
    setMiniSidenav,
    // setOpenConfigurator,
} from "context";

// Images
import brandWhite from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

import ProtectedRoute from "middleware/protectedRoute";

export default function App() {
    const [controller, dispatch] = useMaterialUIController();
    const {
        miniSidenav,
        direction,
        layout,
        // openConfigurator,
        sidenavColor,
        transparentSidenav,
        whiteSidenav,
        darkMode,
    } = controller;
    const [onMouseEnter, setOnMouseEnter] = useState(false);
    const [rtlCache, setRtlCache] = useState(null);
    const { pathname } = useLocation();
    const isPublicPath = pathname.startsWith("/public");

    // Cache for the rtl
    useMemo(() => {
        const cacheRtl = createCache({
            key: "rtl",
            stylisPlugins: [rtlPlugin],
        });

        setRtlCache(cacheRtl);
    }, []);

    // Open sidenav when mouse enter on mini sidenav
    const handleOnMouseEnter = () => {
        if (miniSidenav && !onMouseEnter) {
            setMiniSidenav(dispatch, false);
            setOnMouseEnter(true);
        }
    };

    // Close sidenav when mouse leave mini sidenav
    const handleOnMouseLeave = () => {
        if (onMouseEnter) {
            setMiniSidenav(dispatch, true);
            setOnMouseEnter(false);
        }
    };

    // Setting the dir attribute for the body element
    useEffect(() => {
        document.body.setAttribute("dir", direction);
    }, [direction]);

    // Setting page scroll to 0 when changing the route
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.scrollingElement.scrollTop = 0;
    }, [pathname]);

    const PUBLIC_ROUTE_PATTERNS = [
        "/authentication/sign-in/basic",
        "/authentication/sign-in/cover",
        "/authentication/sign-in/illustration",
        "/authentication/sign-up/cover",
        "/authentication/sign-up/illustration",
        "/authentication/reset-password/cover",

        // public directory
        "/public/directory",

        // public detail pages
        "/public/projects/:id",
        "/public/companies/:id",
        "/public/users/:id",
    ];

    function isPublicRoute(pathPattern) {
        // pathPattern is your route.route from routes config
        // treat exact matches and patterns as public
        return PUBLIC_ROUTE_PATTERNS.some((p) => {
            if (p === pathPattern) return true;

            // simple ":param" support
            const re = new RegExp(
                "^" +
                p
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .replace(/:([^/]+)/g, "[^/]+") +
                "$"
            );
            return re.test(pathPattern);
        });
    }

    const getRoutes = (allRoutes) =>
        allRoutes.map((route) => {
            if (route.collapse) return getRoutes(route.collapse);

            if (route.route) {
                const isPublic = isPublicRoute(route.route);

                return (
                    <Route
                        exact
                        path={route.route}
                        element={
                            isPublic ? (
                                route.component
                            ) : (
                                <ProtectedRoute>{route.component}</ProtectedRoute>
                            )
                        }
                        key={route.key}
                    />
                );
            }

            return null;
        });

    return direction === "rtl" ? (
        <CacheProvider value={rtlCache}>
            <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
                <CssBaseline />
                {layout === "dashboard" && (
                    <>
                        <Sidenav
                            color={sidenavColor}
                            brand={
                                (transparentSidenav && !darkMode) || whiteSidenav
                                    ? brandDark
                                    : brandWhite
                            }
                            brandName="The Carbon Economy"
                            routes={routes}
                            onMouseEnter={handleOnMouseEnter}
                            onMouseLeave={handleOnMouseLeave}
                        />
                        {/* <Configurator /> */}
                        {/* {configsButton} */}
                    </>
                )}
                {/* {layout === "vr" && <Configurator />} */}
                {layout === "vr"}
                <Routes>
                    {getRoutes(routes)}
                    <Route path="*" element={<Navigate to="/authentication/sign-in/illustration" />} />
                </Routes>
            </ThemeProvider>
        </CacheProvider>
    ) : (
        <ThemeProvider theme={darkMode ? themeDark : theme}>
            <CssBaseline />
            {layout === "dashboard" && !isPublicPath && (
                <>
                    <Sidenav
                        color={sidenavColor}
                        brand={
                            (transparentSidenav && !darkMode) || whiteSidenav
                                ? brandDark
                                : brandWhite
                        }
                        brandName="The Carbon Economy"
                        routes={routes}
                        onMouseEnter={handleOnMouseEnter}
                        onMouseLeave={handleOnMouseLeave}
                    />
                    {/* <Configurator /> */}
                    {/* {configsButton} */}
                </>
            )}
            {/* {layout === "vr" && <Configurator />} */}
            {layout === "vr"}
            <Routes>
                {getRoutes(routes)}
                <Route path="*" element={<Navigate to="/authentication/sign-in/illustration" />} />
            </Routes>
        </ThemeProvider>
    );
}
