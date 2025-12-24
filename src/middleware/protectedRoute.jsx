import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("token");

  if (!token) {
    return <Navigate to="/authentication/sign-in/illustration" replace />;
  }

  return children;
}