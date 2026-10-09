export const config = {
    get apiBaseUrl(): string {
        const url = import.meta.env.VITE_API_BASE_URL;
        if (!url) {
            console.warn("VITE_API_BASE_URL is unset, falling back to offline mode.");
        }
        return url || "";
    },
    get defaultAbha(): string {
        return import.meta.env.VITE_DEFAULT_ABHA || "91-1234-5678-9012";
    }
};
