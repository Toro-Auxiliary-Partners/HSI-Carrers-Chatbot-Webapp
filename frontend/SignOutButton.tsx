import React from "react";
import { useMsal } from "@azure/msal-react";
import { useIsAuthenticated } from "@azure/msal-react";

/*const SignOutButton: React.FC = () => {
    const { instance } = useMsal();

    const handleLogout = () => {
        instance.logoutRedirect(); // Redirects user to Azure AD logout
    };

    return (
        <button onClick={handleLogout}>
            Sign out
        </button>
    );
};*/

export const SignOutButton = () => {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const handleLogout = () => {
        // Clear session storage
sessionStorage.clear();

// Clear all cookies (for the current domain)
document.cookie.split(";").forEach((c) => {
    document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
        //window.location.reload();
        instance.logoutRedirect({
                // postLogoutRedirectUri: window.location.origin
            });
        console.log('Logging out: clearing session and refreshing page.');
    };

    

    return <button onClick={handleLogout}>Logout and Clear Session</button>;
};

//export default SignOutButton;
