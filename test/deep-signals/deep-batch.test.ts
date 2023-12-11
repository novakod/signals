import { expect, test, vitest } from "vitest";
import { DeepEffectCbChange, createDeepEffect, createDeepSignal, deepBatch } from "../../src/deep-signals";

test("Тестирование функции deepBatch", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn(() => {
    signal.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal.count++;
  signal.count++;

  expect(spy).toBeCalledTimes(3);
  expect(signal.count).toEqual(2);

  deepBatch(() => {
    signal.count++;
    signal.count++;
  });

  expect(spy).toBeCalledTimes(4);
  expect(signal.count).toEqual(4);
});

test("Тестирование функции deepBatch на нескольких сигналах", () => {
  const signal1 = createDeepSignal({
    count: 0,
  });

  const signal2 = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal1.count;
    signal2.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.lastCall).toEqual([[]]);

  signal1.count++;
  signal1.count++;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal1, path: ["count"], oldValue: 1, newValue: 2 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal1);

  signal2.count++;
  signal2.count++;
  expect(spy).toBeCalledTimes(5);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal2, path: ["count"], oldValue: 1, newValue: 2 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal2);

  signal1.count++;
  signal2.count++;
  expect(spy).toBeCalledTimes(7);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal2, path: ["count"], oldValue: 2, newValue: 3 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal2);

  deepBatch(() => {
    signal1.count++;
    signal1.count++;
  });
  expect(spy).toBeCalledTimes(8);
  expect(spy.mock.lastCall).toEqual([
    [
      { signalValue: signal1, path: ["count"], oldValue: 3, newValue: 4 },
      { signalValue: signal1, path: ["count"], oldValue: 4, newValue: 5 },
    ],
  ]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal1);
  expect(spy.mock.lastCall?.[0]?.[1].signalValue).toBe(signal1);

  deepBatch(() => {
    signal2.count++;
    signal2.count++;
  });
  expect(spy).toBeCalledTimes(9);
  expect(spy.mock.lastCall).toEqual([
    [
      { signalValue: signal2, path: ["count"], oldValue: 3, newValue: 4 },
      { signalValue: signal2, path: ["count"], oldValue: 4, newValue: 5 },
    ],
  ]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal2);
  expect(spy.mock.lastCall?.[0]?.[1].signalValue).toBe(signal2);

  deepBatch(() => {
    signal1.count++;
    signal2.count++;
  });
  expect(spy).toBeCalledTimes(10);
  expect(spy.mock.lastCall).toEqual([
    [
      { signalValue: signal1, path: ["count"], oldValue: 5, newValue: 6 },
      { signalValue: signal2, path: ["count"], oldValue: 5, newValue: 6 },
    ],
  ]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal1);
  expect(spy.mock.lastCall?.[0]?.[1].signalValue).toBe(signal2);
});
