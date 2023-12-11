import { expect, test, vitest } from "vitest";
import { DeepEffectCbChange, createDeepEffect, createDeepSignal, deepCompute } from "../../src/deep-signals";

test("Тестирование функции deepCompute", () => {
  const signal1 = createDeepSignal({
    count: 0,
  });

  const signal2 = createDeepSignal({
    count: 0,
  });

  const signal3 = createDeepSignal({
    count: 0,
  });

  const computedSignal = deepCompute(() => {
    return {
      count: signal1.count + signal2.count,
      nested: {
        count: signal3.count,
      },
    };
  });

  const spy1 = vitest.fn<[DeepEffectCbChange[]]>(() => {
    return computedSignal.count;
  });

  const spy2 = vitest.fn<[DeepEffectCbChange[]]>(() => {
    return computedSignal.nested.count;
  });

  createDeepEffect(spy1);
  createDeepEffect(spy2);

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(1);
  expect(spy1.mock.results[0].value).toBe(0);
  expect(spy2.mock.results[0].value).toBe(0);

  signal1.count++;
  expect(spy1).toBeCalledTimes(2);
  expect(spy2).toBeCalledTimes(1);
  expect(spy1.mock.results[1].value).toBe(1);

  signal2.count = 2;
  expect(spy1).toBeCalledTimes(3);
  expect(spy2).toBeCalledTimes(1);
  expect(spy1.mock.results[2].value).toBe(3);

  signal3.count++;
  expect(spy1).toBeCalledTimes(3);
  expect(spy2).toBeCalledTimes(2);
  expect(spy2.mock.results[1].value).toBe(1);
});
