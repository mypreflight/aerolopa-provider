"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithRetry = fetchWithRetry;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 500;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchWithRetry(url, init = {}, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = options.retries ?? DEFAULT_RETRIES;
    const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...init, signal: controller.signal });
        }
        catch (error) {
            lastError = error;
            if (attempt < retries) {
                await delay(backoffMs * 2 ** attempt);
            }
        }
        finally {
            clearTimeout(timeout);
        }
    }
    throw lastError;
}
//# sourceMappingURL=fetch-with-retry.js.map