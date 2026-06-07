import { describe, expect, it } from "vitest";
import { getSkillContent } from "../src/core/skills.js";

describe("core skill content", () => {
  it("returns compact and full core skill content", () => {
    expect(getSkillContent("core", false)).toContain("## The observe-decide-act loop");
    expect(getSkillContent("core", false)).not.toContain("## Full command reference");
    expect(getSkillContent("core", true)).toContain("## Full command reference");
    expect(getSkillContent("core", true)).toContain("Exit codes:");
  });

  it("rejects unknown skill names", () => {
    expect(() => getSkillContent("missing", false)).toThrow("Unknown skill 'missing'");
  });
});
