import { test, expect, vitest } from "vitest";
import { createDeepSignal, createDeepEffect, deepUntracked, deepBatch, DeepEffectCbChange } from "../src/deep-signals";

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

test.skip("Тестирование глубоких сигналов на дате", () => {
  const obj = createDeepSignal({
    field: {
      date: new Date(),
    },
  });
  const spy = vitest.fn(() => {
    obj.field.date.getTime;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  obj.field.date.setMinutes(20);

  expect(spy).toBeCalledTimes(2);

  obj.field.date.getTime();

  expect(spy).toBeCalledTimes(3);
});

test.skip("Тестирование глубоких сигналов на Map", () => {
  const obj = createDeepSignal({
    field: {
      map: new Map(),
    },
  });
  const spy = vitest.fn(() => {
    console.log(obj.field.map.get("test"));
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  obj.field.map.set("test", "test");

  expect(spy).toBeCalledTimes(2);

  obj.field.map.delete("test");

  expect(spy).toBeCalledTimes(3);
});

test("Тестирование глубоких эффектов на предмет передачи в функцию пути до изменённого поля сигнала", () => {
  const signal = createDeepSignal({
    count: 0,
    nestedField: {
      count: 0,
    },
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>((test) => {
    signal.count;
    signal.nestedField.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.lastCall).toEqual([[{ path: [], oldValue: undefined, newValue: undefined }]]);

  signal.count = 1;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal, path: ["count"], oldValue: 0, newValue: 1 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal);

  signal.nestedField.count = 1;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal, path: ["nestedField", "count"], oldValue: 0, newValue: 1 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal);

  signal.nestedField.count = 0;
  expect(spy).toBeCalledTimes(4);
  expect(spy.mock.lastCall).toEqual([[{ signalValue: signal, path: ["nestedField", "count"], oldValue: 1, newValue: 0 }]]);
  expect(spy.mock.lastCall?.[0]?.[0].signalValue).toBe(signal);
});

test("Тестирование функции deepUntracked", () => {
  const signal = createDeepSignal({
    count: 0,
    nestedField: {
      count: 0,
    },
  });

  const spy = vitest.fn(() => {
    signal.count;
    const nestedCount = deepUntracked(() => {
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

  const spy = vitest.fn(() => {
    signal1.count;
    signal2.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);

  signal1.count++;
  signal1.count++;
  expect(spy).toBeCalledTimes(3);

  signal2.count++;
  signal2.count++;
  expect(spy).toBeCalledTimes(5);

  signal1.count++;
  signal2.count++;
  expect(spy).toBeCalledTimes(7);

  deepBatch(() => {
    signal1.count++;
    signal1.count++;
  });
  expect(spy).toBeCalledTimes(8);

  deepBatch(() => {
    signal2.count++;
    signal2.count++;
  });
  expect(spy).toBeCalledTimes(9);

  deepBatch(() => {
    signal1.count++;
    signal2.count++;
  });
  expect(spy).toBeCalledTimes(10);
});
