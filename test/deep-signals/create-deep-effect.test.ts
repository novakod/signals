import { createDeepEffect, createDeepSignal } from "../../src/deep-signals";
import { test, expect, vitest } from "vitest";

test("Тестирования глубоких сигналов на функции, в которой не используются сигналы", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn();

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal.count++;

  expect(spy).toBeCalledTimes(1);
});

test("Тестирования глубоких сигналов на функции, в которой используются сигналы", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn(() => {
    signal.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal.count++;

  expect(spy).toBeCalledTimes(2);
});

test("Тестирования глубоких сигналов на функции, в которой используется несколько сигналов", () => {
  let dummy;
  const signal1 = createDeepSignal({
    count: 0,
  });
  const signal2 = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn(() => {
    dummy = signal1.count + signal2.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(dummy).toBe(0);

  signal1.count++;

  expect(spy).toBeCalledTimes(2);
  expect(dummy).toBe(1);

  signal2.count++;

  expect(spy).toBeCalledTimes(3);
  expect(dummy).toBe(2);
});

test("Тестирование глубоких сигналов на нескольких эффектах", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy1 = vitest.fn(() => {
    signal.count;
  });
  const spy2 = vitest.fn(() => {
    signal.count;
  });

  createDeepEffect(spy1);
  createDeepEffect(spy2);

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(1);

  signal.count++;

  expect(spy1).toBeCalledTimes(2);
  expect(spy2).toBeCalledTimes(2);
});

test("Тестирование глубоких сигналов, с использованием цепочки вызовов функций", () => {
  let dummy;
  const signal = createDeepSignal({
    count: 0,
  });

  const getSignalValue = () => signal.count;

  const spy = vitest.fn(() => {
    dummy = getSignalValue();
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(dummy).toBe(0);

  signal.count++;

  expect(spy).toBeCalledTimes(2);
  expect(dummy).toBe(1);

  signal.count++;

  expect(spy).toBeCalledTimes(3);
  expect(dummy).toBe(2);
});

test("Тестирование обнаружения зависимостей, до которых нельзя дойти при первом запуске функции", () => {
  const signal1 = createDeepSignal({
    count: 0,
  });
  const signal2 = createDeepSignal({
    count: 0,
  });

  const spy1 = vitest.fn();
  const spy2 = vitest.fn();

  createDeepEffect(() => {
    if (signal1.count < 2) {
      spy1();
    } else if (signal2.count >= 0) {
      spy2();
    }
  });

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(0);

  signal1.count = 2;

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(1);

  signal2.count = 5;

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(2);
});

test("Тестирование эффекта, в котором изменение сигнала неактивной ветки не приводит к вызову эффекта", () => {
  let dummy;
  const signal1 = createDeepSignal({
    field: {
      value: true,
    },
  });
  const signal2 = createDeepSignal({
    field: {
      value: "value",
    },
  });

  const spy = vitest.fn(() => {
    dummy = signal1.field.value ? signal2.field.value : "other";
  });
  createDeepEffect(spy);

  expect(dummy).toBe("value");
  expect(spy).toBeCalledTimes(1);

  signal1.field.value = false;
  expect(dummy).toBe("other");
  expect(spy).toBeCalledTimes(2);
});

test("Тестирование глубокого эффекта, который не должен вызываться если в глубокий сигнал устанавливается такое же значение", () => {
  let dummy;
  const signal = createDeepSignal({
    value: 0,
  });

  const spy = vitest.fn(() => {
    dummy = signal.value;
  });

  createDeepEffect(spy);

  expect(dummy).toBe(0);
  expect(spy).toBeCalledTimes(1);

  signal.value = 2;

  expect(dummy).toBe(2);
  expect(spy).toBeCalledTimes(2);

  signal.value = 2;

  expect(dummy).toBe(2);
  expect(spy).toBeCalledTimes(2);
});

test("Тестирование глубоких сигналов на массивах", () => {
  const signal = createDeepSignal({
    array: [
      {
        id: 1,
        age: 20,
      },
      {
        id: 2,
        age: 22,
      },
    ],
  });

  const spy = vitest.fn(() => {
    signal.array[0].age;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal.array[0].age = 21;

  expect(spy).toBeCalledTimes(2);

  signal.array[0].id = 0;

  expect(spy).toBeCalledTimes(2);

  signal.array.push({
    id: 3,
    age: 23,
  });

  expect(spy).toBeCalledTimes(2);

  signal.array[0] = {
    id: 0,
    age: 21,
  };

  expect(spy).toBeCalledTimes(3);

  signal.array[0].id = 1;

  expect(spy).toBeCalledTimes(3);

  signal.array[0].age = 20;

  expect(spy).toBeCalledTimes(4);

  const signal2 = createDeepSignal({
    arr: [1, 2, 3],
  });

  const spy2 = vitest.fn(() => {
    signal2.arr;
  });

  createDeepEffect(spy2);

  expect(spy2).toBeCalledTimes(1);

  signal2.arr.push(4);
  expect(spy2).toBeCalledTimes(2);
});

test("Тестирование отмены глубоких эффектов", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn(() => {
    signal.count;
  });

  const effect = createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal.count = 1;

  expect(spy).toBeCalledTimes(2);

  effect.dispose();

  signal.count = 2;

  expect(spy).toBeCalledTimes(2);
});
