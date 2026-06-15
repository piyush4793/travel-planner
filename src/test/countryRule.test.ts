import { describe, it, expect } from "vitest";
import { fileKey } from "../hooks/useCountryRule";

describe("fileKey — P1", () => {
  it("builds the expected path for a basic country name", () => {
    expect(fileKey("Vietnam")).toBe("../../data/rules/vietnam.json");
  });

  it("slugifies multi-word country names", () => {
    expect(fileKey("South Africa")).toBe("../../data/rules/south-africa.json");
  });

  it("normalizes accented characters", () => {
    expect(fileKey("São Tomé")).toBe("../../data/rules/sao-tome.json");
  });

  it("keeps already lowercase names stable", () => {
    expect(fileKey("japan")).toBe("../../data/rules/japan.json");
  });
});
