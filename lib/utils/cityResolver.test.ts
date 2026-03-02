import { describe, it, expect } from "vitest"
import { resolveCityNameToId } from "./cityResolver"

describe("resolveCityNameToId", () => {
  it("resolves city name to id", () => {
    expect(resolveCityNameToId("NC", "Charlotte")).toBe("charlotte")
    expect(resolveCityNameToId("AR", "Little Rock")).toBe("little-rock")
  })

  it("resolves city id to id (passthrough)", () => {
    expect(resolveCityNameToId("NC", "charlotte")).toBe("charlotte")
    expect(resolveCityNameToId("AR", "little-rock")).toBe("little-rock")
  })

  it("is case-insensitive for names", () => {
    expect(resolveCityNameToId("NC", "charlotte")).toBe("charlotte")
    expect(resolveCityNameToId("NC", "CHARLOTTE")).toBe("charlotte")
  })

  it("returns null for unknown city", () => {
    expect(resolveCityNameToId("NC", "UnknownCity")).toBeNull()
    expect(resolveCityNameToId("AR", "FakeTown")).toBeNull()
  })

  it("returns null for unknown state", () => {
    expect(resolveCityNameToId("XX", "Charlotte")).toBeNull()
  })

  it("returns null for empty inputs", () => {
    expect(resolveCityNameToId("", "Charlotte")).toBeNull()
    expect(resolveCityNameToId("NC", "")).toBeNull()
    expect(resolveCityNameToId("NC", "  ")).toBeNull()
  })
})
