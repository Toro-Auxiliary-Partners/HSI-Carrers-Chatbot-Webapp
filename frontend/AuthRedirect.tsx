import { useIsAuthenticated } from "@azure/msal-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthRedirect = () => {
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/chat");
        }
    }, [isAuthenticated, navigate]);

    return null;
};

export default AuthRedirect;
