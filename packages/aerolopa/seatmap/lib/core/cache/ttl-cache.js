"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtlCache = void 0;
class TtlCache {
    now;
    entries = new Map();
    constructor(now = Date.now) {
        this.now = now;
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    }
    get size() {
        return this.entries.size;
    }
}
exports.TtlCache = TtlCache;
//# sourceMappingURL=ttl-cache.js.map