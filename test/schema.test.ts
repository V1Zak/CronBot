import { expect, test, describe } from "bun:test";
import { jobSchema } from "../src/utils/job-schema";

describe("Schema Validation", () => {
  test("valid job schema", () => {
    const validJob = {
      name: "Test Job",
      schedule: "* * * * *",
      steps: [
        {
          id: "step1",
          type: "mcp",
          server: "test",
          tool: "test_tool",
          input: {}
        },
        {
          id: "step2",
          type: "transform",
          source: "{{ steps.step1.output }}",
          query: "items"
        }
      ]
    };
    
    expect(() => jobSchema.parse(validJob)).not.toThrow();
  });

  test("invalid job schema - missing steps", () => {
    const invalidJob = {
      name: "Test Job"
    };
    
    expect(() => jobSchema.parse(invalidJob)).toThrow();
  });

  test("invalid job schema - bad type", () => {
    const invalidJob = {
      name: "Test",
      steps: [
        {
          id: "s1",
          type: "unknown"
        }
      ]
    };
    expect(() => jobSchema.parse(invalidJob)).toThrow();
  });
});
