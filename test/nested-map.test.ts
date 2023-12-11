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
  expect(spy).toBeCalledWith("test_abc", ["a", "b", "c"]);
  expect(spy).toBeCalledWith("test_ab", ["a", "b"]);
  expect(spy).toBeCalledWith("test_abcd", ["a", "b", "c", "d"]);
  expect(nestedMap.delete(["a", "b", "c"])).toBe(true);
  expect(nestedMap.delete(["a", "b", "c"])).toBe(false);
  expect(nestedMap.delete(["a", "b"])).toBe(true);
  expect(nestedMap.delete(["a"])).toBe(false);

  const symbol = Symbol("test");

  expect(nestedMap.set([symbol], "test")).toBe(nestedMap);
  expect(nestedMap.set([Symbol.for("test")], "for_test")).toBe(nestedMap);
  expect(nestedMap.get(["test", symbol])).toBe(undefined);
  expect(nestedMap.get([Symbol("test")])).toBe(undefined);
  expect(nestedMap.get([Symbol.for("test")])).toBe("for_test");
  expect(nestedMap.delete([Symbol("test")])).toBe(false);
  expect(nestedMap.delete([symbol])).toBe(true);
  expect(nestedMap.delete([symbol])).toBe(false);
  expect(nestedMap.delete([Symbol.for("test")])).toBe(true);
  expect(nestedMap.delete([Symbol.for("test")])).toBe(false);

  expect(nestedMap.set([0, 1], "numbers")).toBe(nestedMap);
  expect(nestedMap.get([0, 1])).toBe("numbers");
  expect(nestedMap.get([0])).toBe(undefined);
  expect(nestedMap.delete([0, 1])).toBe(true);
  expect(nestedMap.delete([0, 1])).toBe(false);
});
