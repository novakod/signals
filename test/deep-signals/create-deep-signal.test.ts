import { createDeepSignal } from "../../src/deep-signals";
import { test, expect } from "vitest";

test("1. Тестирование функции createDeepSignal", () => {
  const signal = createDeepSignal({ a: 1 });

  expect(signal.a).toBe(1);
});
