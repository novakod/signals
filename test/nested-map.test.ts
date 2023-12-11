import { expect, test, vitest } from "vitest";
import { NestedMap } from "../src/nested-map";

test.only("Тестирование класса NestedMap", () => {
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

  const spy = vitest.fn<[unknown, path: (string | number | symbol)[]]>();

  nestedMap.forEach(spy);

  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.calls[0]).toEqual(["test_abc", ["a", "b", "c"]]);
  expect(spy.mock.calls[1]).toEqual(["test_ab", ["a", "b"]]);
  expect(spy.mock.calls[2]).toEqual(["test_abcd", ["a", "b", "c", "d"]]);

  expect(nestedMap.delete(["a", "b", "c"])).toBe(true);

  expect(nestedMap.delete(["a", "b", "c"])).toBe(false);

  expect(nestedMap.delete(["a", "b"])).toBe(true);

  expect(nestedMap.delete(["a"])).toBe(false);
});
