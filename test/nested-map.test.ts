import { expect, test } from "vitest";
import { NestedMap } from "../src/nested-map";

test("Тестирование класса NestedMap", () => {
  const nestedMap = new NestedMap();

  expect(nestedMap.set(["a", "b", "c"], "test_abc")).toBe(nestedMap);

  expect(nestedMap.set(["a", "b"], "test_ab")).toBe(nestedMap);

  expect(nestedMap.set(["a", "b", "c", "d"], "test_abcd")).toBe(nestedMap);

  expect(nestedMap.get(["a", "b", "c"])).toBe("test_abc");

  expect(nestedMap.get(["a", "b"])).toBe("test_ab");

  expect(nestedMap.get(["a", "b", "c", "d"])).toBe("test_abcd");

  expect(nestedMap.get(["a"])).toBe(undefined);

  expect(nestedMap.has(["a", "b"])).toBe(true);

  expect(nestedMap.has(["a"])).toBe(false);

  expect(nestedMap.delete(["a", "b", "c"])).toBe(true);

  expect(nestedMap.delete(["a", "b", "c"])).toBe(false);

  expect(nestedMap.delete(["a", "b"])).toBe(true);

  expect(nestedMap.delete(["a"])).toBe(false);
});
