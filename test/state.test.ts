import { expect, test, describe, beforeEach } from "bun:test";
import { StateStore } from "../src/db/store";

describe("State Persistence", () => {
  let store: StateStore;

  beforeEach(() => {
    // Use an in-memory DB to avoid concurrency issues during testing
    store = new StateStore(":memory:");
  });

  test("commit saves state", () => {
    store.withTransaction(() => {
      store.writeState("job1", { last_sync: "123" });
    });
    const state = store.readState("job1");
    expect(state.last_sync).toBe("123");
  });

  test("rollback discards state", () => {
    try {
      store.withTransaction(() => {
        store.writeState("job1", { last_sync: "123" });
        throw new Error("abort");
      });
    } catch (e) {}
    
    const state = store.readState("job1");
    expect(state.last_sync).toBeUndefined();
  });
  
  test("overwrite existing state", () => {
    store.withTransaction(() => {
      store.writeState("job1", { key: "val1" });
    });
    
    store.withTransaction(() => {
      store.writeState("job1", { key: "val2" });
    });
    
    const state = store.readState("job1");
    expect(state.key).toBe("val2");
  });
});
