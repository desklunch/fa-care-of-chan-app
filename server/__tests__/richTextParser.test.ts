import { describe, it, expect } from "vitest";
import { parseRichText, HIGHLIGHT_COLOR } from "../richTextParser";

describe("parseRichText highlight (==...==)", () => {
  it("renders a bare highlight with the canonical color and strips sentinels", () => {
    const segments = parseRichText("==danger==");
    expect(segments).toEqual([{ text: "danger", color: HIGHLIGHT_COLOR }]);
  });

  it("renders a highlight inside surrounding text", () => {
    const segments = parseRichText("before ==middle== after");
    expect(segments).toEqual([
      { text: "before " },
      { text: "middle", color: HIGHLIGHT_COLOR },
      { text: " after" },
    ]);
  });

  it("composes with bold formatting inside a highlight", () => {
    const segments = parseRichText("==**bold**==");
    expect(segments).toEqual([
      { text: "bold", bold: true, color: HIGHLIGHT_COLOR },
    ]);
  });

  it("composes with italic formatting around a highlight", () => {
    const segments = parseRichText("*==hi==*");
    expect(segments).toEqual([
      { text: "hi", italic: true, color: HIGHLIGHT_COLOR },
    ]);
  });

  it("does not match a highlight that spans a blank line", () => {
    const segments = parseRichText("==open\n\nclose==");
    const joined = segments.map((s) => s.text).join("");
    expect(joined).toContain("==open");
    expect(joined).toContain("close==");
    expect(segments.every((s) => s.color === undefined)).toBe(true);
  });

  it("still renders legacy <span style='color: ...'> highlights", () => {
    const segments = parseRichText('<span style="color: #ff0000">old</span>');
    expect(segments).toEqual([{ text: "old", color: "#ff0000" }]);
  });
});
