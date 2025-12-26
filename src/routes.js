// Layouts
import ProfileGate from "layouts/users/profileGate";
import UserProfileView from "layouts/users/user-overview";
import MyProfileOverview from "layouts/users/my-profile";
import CreateUserProfile from "layouts/users/create-user";
import EditUserProfile from "layouts/users/edit-user";

import Analytics from "layouts/dashboards/analytics";
import AllProjects from "layouts/projects/all-projects";
import ProjectOverview from "layouts/projects/project-overview";
import CreateProject from "layouts/projects/create-project";
import EditProject from "layouts/projects/edit-project";

import Directory from "layouts/directory";
import AllCompanies from "layouts/companies/all-companies";
import CompanyOverview from "layouts/companies/company-overview";
import CreateCompany from "layouts/companies/create-company";
import EditCompany from "layouts/companies/edit-company";

// Auth layouts
import SignInBasic from "layouts/authentication/sign-in/basic";
import SignInCover from "layouts/authentication/sign-in/cover";
import SignInIllustration from "layouts/authentication/sign-in/illustration";
import SignUpCover from "layouts/authentication/sign-up/cover";
import SignUpIllustration from "layouts/authentication/sign-up/illustration";
import ResetCover from "layouts/authentication/reset-password/cover";
import Logout from "layouts/authentication/logout";

import PublicDirectory from "layouts/public/directory";
import PublicProjectOverview from "layouts/public/projects";
import PublicCompanyOverview from "layouts/public/companies";
import PublicUserOverview from "layouts/public/users";

import Icon from "@mui/material/Icon";

const routes = [
    // 1. My Profile
    {
        type: "collapse",
        name: "My Profile",
        key: "my-profile",
        icon: <Icon fontSize="small">person</Icon>,
        route: "/users/me",
        component: <ProfileGate />,
        noCollapse: true,
    },

    {
        key: "create-user",
        route: "/users/new",
        component: <CreateUserProfile />,
    },

    {
        key: "edit-user",
        route: "/users/me/edit",
        component: <EditUserProfile />,
    },

    {
        key: "my-profile-overview",
        route: "/users/me/profile",
        component: <MyProfileOverview />,
    },

        {
        key: "user-overview",
        route: "/users/:id",
        component: <UserProfileView />,
    },


    // 2. Home (dashboard)
    {
        type: "collapse",
        name: "Home",
        key: "home",
        icon: <Icon fontSize="small">dashboard</Icon>,
        route: "/dashboards/analytics",
        component: <Analytics />,
        noCollapse: true,
    },

    // 3. Directory (global project listing)
    {
        type: "collapse",
        name: "Directory",
        key: "directory",
        icon: <Icon fontSize="small">search</Icon>,
        route: "/directory",
        component: <Directory />,
        noCollapse: true,
    },

    // 4. My Projects
    {
        type: "collapse",
        name: "My Projects",
        key: "my-projects",
        icon: <Icon fontSize="small">workspaces</Icon>,
        route: "/my-projects",
        component: <AllProjects />, // reuse for now
        noCollapse: true,
    },

    // project drilldown
    {
        key: "project-overview",
        route: "/projects/:id",
        component: <ProjectOverview />,
    },

    {
        key: "create-project",
        route: "/projects/new",
        component: <CreateProject />,
    },

    {
        key: "edit-project",
        route: "/projects/:id/edit",
        component: <EditProject />,
    },

    // 5. My Companies
    {
        type: "collapse",
        name: "My Companies",
        key: "my-companies",
        icon: <Icon fontSize="small">business</Icon>,
        route: "/my-companies",
        component: <AllCompanies />,
        noCollapse: true,
    },

    // company drilldown
    {
        key: "company-overview",
        route: "/companies/:id",
        component: <CompanyOverview />,
    },

    {
        key: "create-company",
        route: "/companies/new",
        component: <CreateCompany />,
    },

    {
        key: "edit-company",
        route: "/companies/:id/edit",
        component: <EditCompany />,
    },

    // Optional: Logout somewhere in the sidenav
    {
        type: "collapse",
        name: "Logout",
        key: "logout",
        icon: <Icon fontSize="small">logout</Icon>,
        route: "/logout",
        component: <Logout />,
        noCollapse: true,
    },

    // --- Auth routes (NO type => not rendered in Sidenav, but still used by App.js router) ---

    {
        key: "sign-in-basic",
        route: "/authentication/sign-in/basic",
        component: <SignInBasic />,
    },
    {
        key: "sign-in-cover",
        route: "/authentication/sign-in/cover",
        component: <SignInCover />,
    },
    {
        key: "sign-in-illustration",
        route: "/authentication/sign-in/illustration",
        component: <SignInIllustration />,
    },
    {
        key: "sign-up-cover",
        route: "/authentication/sign-up/cover",
        component: <SignUpCover />,
    },
    {
        key: "sign-up-illustration",
        route: "/authentication/sign-up/illustration",
        component: <SignUpIllustration />,
    },
    {
        key: "reset-password-cover",
        route: "/authentication/reset-password/cover",
        component: <ResetCover />,
    },

    {
        key: "public-directory",
        route: "/public/directory",
        component: <PublicDirectory />,
    },
    {
        key: "public-project-overview",
        route: "/public/projects/:id",
        component: <PublicProjectOverview />,
    },
    {
        key: "public-company-overview",
        route: "/public/companies/:id",
        component: <PublicCompanyOverview />,
    },
    {
        key: "public-user-overview",
        route: "/public/users/:id",
        component: <PublicUserOverview />,
    },
];

export default routes;