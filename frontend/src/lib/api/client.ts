import { config } from '../config';
import { z } from 'zod';

export class ApiError extends Error {
    public status?: number;
    public code: string;

    constructor(message: string, code: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, backoff = 200): Promise<Response> {
    try {
        const res = await fetch(url, options);
        if (res.status >= 500 && retries > 0) {
            await new Promise((r) => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        return res;
    } catch (err) {
        if (retries > 0 && err instanceof TypeError) { // fetch throws TypeError on network failure
            await new Promise((r) => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

export async function apiClient<T>(
    endpoint: string, 
    schema: z.ZodSchema<T>, 
    options: RequestInit = {}
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const baseUrl = config.apiBaseUrl;
    // Note: if VITE_API_BASE_URL is missing, we could try the proxy. We will just use the provided URL or fallback to proxy.
    const url = baseUrl ? `${baseUrl}${endpoint}` : `/api${endpoint}`;

    try {
        const res = await fetchWithRetry(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        }, options.method === 'GET' || !options.method ? 1 : 0);
        
        clearTimeout(timeoutId);

        if (!res.ok) {
            let errorData: any = null;
            try {
                errorData = await res.json();
            } catch {
                // Ignore parsing errors
            }

            if (res.status === 429) {
                throw new ApiError("Too many lookups, try again in a moment", "RATE_LIMIT", 429);
            }

            const message = errorData?.error?.message || res.statusText || "Request failed";
            const code = errorData?.error?.code || "UNKNOWN";
            
            throw new ApiError(message, code, res.status);
        }

        const data = await res.json();
        
        // Zod validation
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            console.error("Zod validation error:", parsed.error);
            throw new ApiError("Validation failed", "VALIDATION_ERROR", 500);
        }
        
        return parsed.data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err instanceof ApiError) {
            throw err;
        }

        if (err.name === 'AbortError') {
            throw new ApiError("Request timed out", "TIMEOUT");
        }

        throw new ApiError(err.message || "Network error", "NETWORK");
    }
}
