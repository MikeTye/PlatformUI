import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const nav = useNavigate();

  useEffect(() => {
    // Clear auth state
    sessionStorage.removeItem("token");

    // Optionally clear any other stuff later (user info, etc.)

    // Redirect to sign-in
    nav("/authentication/sign-in/illustration", { replace: true });
  }, [nav]);

  // No UI needed; it's just a redirect
  return null;
}