import { expect, test, vitest } from "vitest";
import { createDeepEffect, createDeepSignal, deepUntrack } from "../../src/deep-signals";

test("1. Тестирование функции deepUntracked", () => {
  const signal = createDeepSignal({
    count: 0,
    nestedField: {
      count: 0,
    },
  });

  const spy = vitest.fn(() => {
    signal.count;
    const nestedCount = deepUntrack(() => {
      return signal.nestedField.count;
    });

    return nestedCount;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.results[0].value).toEqual(0);

  signal.count = 1;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.results[1].value).toEqual(0);

  signal.nestedField.count = 1;
  expect(spy).toBeCalledTimes(2);

  signal.count = 2;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.results[2].value).toEqual(1);
});
