// MSAL configuration for Azure AD authentication
const baseUri = "http://localhost:50505";

export const msalConfig = {
    auth: {
        clientId: "022fb5e8-f6fb-4827-abe5-18f8a1cff62f", // Application (client) ID
        authority: "https://login.microsoftonline.com/8525bbee-114f-4aa9-a0e4-6110954ed79b", // Tenant ID
        redirectUri:  "http://localhost:50505", // Redirect URI after login

        postLogoutRedirectUri: baseUri,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

export const loginRequest = {
    scopes: ["User.Read"] // Add other scopes as needed
};
