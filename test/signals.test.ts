import { test, expect, vitest } from "vitest";
import { createEffect, createSignal } from "../src/signals";

test("Тестирование сигналов на простом примере", () => {
  let dummy;
  const signal = createSignal(0);

  const spy = vitest.fn(() => {
    dummy = signal.value;
  });

  createEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(dummy).toBe(0);
});

test("Тестирование нескольких сигналов", () => {
  let dummy;
  const signal1 = createSignal(1);
  const signal2 = createSignal(1);

  const spy = vitest.fn(() => {
    dummy = signal1.value + signal2.value;
  });

  createEffect(spy);

  expect(dummy).toBe(2);
  signal1.value = 2;
  expect(dummy).toBe(3);
  signal2.value = 3;
  expect(dummy).toBe(5);

  expect(spy).toBeCalledTimes(3);
});

test("Тестирование сигналов с несколькими эффектами", () => {
  let dummy1, dummy2;
  const signal = createSignal(0);

  createEffect(() => (dummy1 = signal.value));
  createEffect(() => (dummy2 = signal.value));

  expect(dummy1).toBe(0);
  expect(dummy2).toBe(0);

  signal.value = 1;

  expect(dummy1).toBe(1);
  expect(dummy2).toBe(1);
});

test("Тестирование эффектов с цепочкой вызовов функций", () => {
  let dummy;
  const signal = createSignal(0);

  const getDummy = () => signal.value;

  const spy = vitest.fn(() => {
    dummy = getDummy();
  });

  createEffect(spy);

  expect(dummy).toBe(0);

  signal.value = 1;

  expect(dummy).toBe(1);

  expect(spy).toBeCalledTimes(2);
});

test("Тестирование обнаружения зависимостей, до которых нельзя дойти при первом запуске функции", () => {
  const signal1 = createSignal(0);
  const signal2 = createSignal(0);

  const spy1 = vitest.fn();
  const spy2 = vitest.fn();

  createEffect(() => {
    if (signal1.value < 2) {
      spy1();
    } else if (signal2.value >= 0) {
      spy2();
    }
  });

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(0);

  signal1.value = 2;

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(1);

  signal2.value = 5;

  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(2);
});

test("Тестирование эффекта, в котором изменение сигнала неактивной ветки не приводит к вызову эффекта", () => {
  let dummy;
  const signal1 = createSignal(true);
  const signal2 = createSignal("value");

  const spy = vitest.fn(() => {
    dummy = signal1.value ? signal2.value : "other";
  });
  createEffect(spy);

  expect(dummy).toBe("value");
  expect(spy).toBeCalledTimes(1);

  signal1.value = false;
  expect(dummy).toBe("other");
  expect(spy).toBeCalledTimes(2);
});

test("Тестирование эффекта, который не должен вызываться если в сигнал устанавливается такое же значение", () => {
  let dummy;
  const signal = createSignal(0);

  const spy = vitest.fn(() => {
    dummy = signal.value;
  });

  createEffect(spy);

  expect(dummy).toBe(0);
  expect(spy).toBeCalledTimes(1);

  signal.value = 2;

  expect(dummy).toBe(2);
  expect(spy).toBeCalledTimes(2);

  signal.value = 2;

  expect(dummy).toBe(2);
  expect(spy).toBeCalledTimes(2);
});
