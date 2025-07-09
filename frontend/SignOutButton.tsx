import React from "react";
import { useMsal } from "@azure/msal-react";

export const SignOutButton = () => {
    const { instance } = useMsal();

    const handleLogout = () => {
        // Clear session storage (removes MSAL tokens and app state)
        sessionStorage.clear();
        // Redirect to MSAL logout page (removes MSAL cookies and ends session)
        instance.logoutRedirect();
    };

    return <button onClick={handleLogout}>Sign out</button>;
};
