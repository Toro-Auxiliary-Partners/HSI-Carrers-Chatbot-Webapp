import React from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig.js";

export const SignInButton = () => {
    const { instance } = useMsal();
    const handleLogin = () => {
        instance.loginRedirect(loginRequest); // Use default redirectUri from MSAL config
    };
    return <button onClick={handleLogin}>Login</button>;
};

