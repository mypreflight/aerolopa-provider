import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  it("returns a stored value before it expires", () => {
    let now = 1000;
    const cache = new TtlCache(() => now);

    cache.set("key", "value", 500);
    now = 1400;

    expect(cache.get("key")).toBe("value");
  });

  it("drops a value once its ttl has passed", () => {
    let now = 1000;
    const cache = new TtlCache(() => now);

    cache.set("key", "value", 500);
    now = 1500;

    expect(cache.get("key")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("returns undefined for an unknown key", () => {
    expect(new TtlCache().get("missing")).toBeUndefined();
  });
});
