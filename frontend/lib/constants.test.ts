import { describe, it, expect } from "vitest";
import { PERSONAS, MODULE_BULLETS, NAV_ITEMS } from "@/lib/constants";
import type { Persona } from "@/lib/constants";

describe("PERSONAS", () => {
  it("contains exactly the two required personas", () => {
    expect(PERSONAS).toEqual([
      "Director of Demand Planning",
      "Supply Chain Director",
    ]);
  });

  it("has MODULE_BULLETS for every persona", () => {
    for (const p of PERSONAS) {
      const bullets = MODULE_BULLETS[p as Persona];
      expect(bullets).toBeDefined();
      expect(bullets.autonomous.length).toBeGreaterThan(0);
      expect(bullets.interactive.length).toBeGreaterThan(0);
    }
  });
});

describe("NAV_ITEMS", () => {
  it("includes the autonomous module entry", () => {
    const auto = NAV_ITEMS.find((n) => n.id === "autonomous");
    expect(auto).toBeDefined();
    expect(auto!.path).toBe("/autonomous");
    expect(auto!.disabled).toBe(false);
  });
});
