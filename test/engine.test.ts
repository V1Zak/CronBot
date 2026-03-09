import { expect, test, describe } from "bun:test";
import { renderTemplate } from "../src/utils/template";
import { TransformEngine } from "../src/transform";

describe("Engine Utilities", () => {
  test("template rendering - basic interpolation", () => {
    const ctx = {
      steps: {
        filter: { output: "hello world" }
      },
      state: {
        last_ts: "12345"
      }
    };
    
    const rendered = renderTemplate("Last output: {{ steps.filter.output }} at {{ state.last_ts }}", ctx);
    expect(rendered).toBe("Last output: hello world at 12345");
  });

  test("template rendering - nested objects", () => {
    const ctx = {
      user: { name: "Alice", age: 30 }
    };
    
    const template = {
      greeting: "Hello {{ user.name }}",
      info: { age: "{{ user.age }}" }
    };
    
    const rendered = renderTemplate(template, ctx);
    expect(rendered).toEqual({
      greeting: "Hello Alice",
      info: { age: 30 }
    });
  });

  test("transform engine - jmespath projection", () => {
    const engine = new TransformEngine();
    const data = {
      items: [
        { id: 1, val: "a" },
        { id: 2, val: "b" }
      ]
    };

    const res = engine.run(data, "items[*].val");
    expect(res).toEqual(["a", "b"]);
  });

  test("transform engine - wildcard projection", () => {
    const engine = new TransformEngine();
    const data = {
      items: [
        { id: 1, text: "a" },
        { id: 2, text: "b" }
      ]
    };

    const res = engine.run(data, "items[*].text");
    expect(res).toEqual(["a", "b"]);
  });

  test("transform engine - script transform", () => {
    const engine = new TransformEngine();
    const data = [
      { id: 1, val: "a", hidden: true },
      { id: 2, val: "b", hidden: false }
    ];

    const res = engine.run(data, "${ data.filter(x => !x.hidden).map(x => x.val) }");
    expect(res).toEqual(["b"]);
  });
});
