import { DeepEffectCbChange, createDeepEffect, createDeepSignal } from "../../src/deep-signals";
import { test, expect, vitest, vi } from "vitest";

test("Тестирование глубоких эффектов на функции, в которой не используются сигналы", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>();

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.count++;

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);
});

test("Тестирование глубоких эффектов на функции, в которой используются один сигнал", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.count++;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
});

test("Тестирование глубоких эффектов на функции, в которой используется несколько сигналов", () => {
  let dummy;
  const signal1 = createDeepSignal({
    count: 0,
  });
  const signal2 = createDeepSignal({
    count: 0,
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    dummy = signal1.count + signal2.count;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);
  expect(dummy).toBe(0);

  signal1.count++;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal1,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
  expect(dummy).toBe(1);

  signal2.count++;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.calls[2]).toEqual([
    [
      {
        signalValue: signal2,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
  expect(dummy).toBe(2);
});

test("Тестирование нескольких эффектов, подписанных на один сигнал", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spy1 = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.count;
  });
  const spy2 = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.count;
  });

  createDeepEffect(spy1);
  createDeepEffect(spy2);

  expect(spy1).toBeCalledTimes(1);
  expect(spy1.mock.calls[0]).toEqual([[]]);
  expect(spy2).toBeCalledTimes(1);
  expect(spy2.mock.calls[0]).toEqual([[]]);

  signal.count++;
  expect(spy1).toBeCalledTimes(2);
  expect(spy1.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
  expect(spy2).toBeCalledTimes(2);
  expect(spy1.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
});

test("Тестирование глубоких эффектов, с использованием цепочки вызовов функций", () => {
  let dummy;
  const signal = createDeepSignal({
    count: 0,
  });

  const getSignalValue = () => signal.count;

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    dummy = getSignalValue();
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);
  expect(dummy).toBe(0);

  signal.count++;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["count"],
        oldValue: 0,
        newValue: 1,
      },
    ],
  ]);
  expect(dummy).toBe(1);

  signal.count++;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.calls[2]).toEqual([
    [
      {
        signalValue: signal,
        path: ["count"],
        oldValue: 1,
        newValue: 2,
      },
    ],
  ]);
  expect(dummy).toBe(2);
});

test("Тестирование обнаружения зависимостей, до которых нельзя дойти при первом запуске функции", () => {
  const signal1 = createDeepSignal({
    count: 0,
  });
  const signal2 = createDeepSignal({
    count: 0,
  });

  const spy1 = vitest.fn<[DeepEffectCbChange[]]>();
  const spy2 = vitest.fn<[DeepEffectCbChange[]]>();

  createDeepEffect((changes) => {
    if (signal1.count < 2) {
      spy1(changes);
    } else if (signal2.count >= 0) {
      spy2(changes);
    }
  });

  expect(spy1).toBeCalledTimes(1);
  expect(spy1.mock.calls[0]).toEqual([[]]);
  expect(spy2).toBeCalledTimes(0);
  expect(spy2.mock.calls).toEqual([]);

  signal1.count = 2;
  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(1);
  expect(spy2.mock.calls[0]).toEqual([
    [
      {
        signalValue: signal1,
        path: ["count"],
        oldValue: 0,
        newValue: 2,
      },
    ],
  ]);

  signal2.count = 5;
  expect(spy1).toBeCalledTimes(1);
  expect(spy2).toBeCalledTimes(2);
  expect(spy2.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal2,
        path: ["count"],
        oldValue: 0,
        newValue: 5,
      },
    ],
  ]);
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

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    dummy = signal1.field.value ? signal2.field.value : "other";
  });

  createDeepEffect(spy);

  expect(dummy).toBe("value");
  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal1.field.value = false;
  expect(dummy).toBe("other");
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal1,
        path: ["field", "value"],
        oldValue: true,
        newValue: false,
      },
    ],
  ]);

  signal2.field.value = "changed";
  expect(dummy).toBe("other");
  expect(spy).toBeCalledTimes(2);
});

test("Тестирование глубокого эффекта, который не должен вызываться если в глубокий сигнал устанавливается такое же значение", () => {
  let dummy;
  const signal = createDeepSignal({
    value: 0,
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    dummy = signal.value;
  });

  createDeepEffect(spy);

  expect(dummy).toBe(0);
  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.value = 2;
  expect(dummy).toBe(2);
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["value"],
        oldValue: 0,
        newValue: 2,
      },
    ],
  ]);

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

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.array[0].age;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.array[0].age = 21;
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["array", "0", "age"],
        oldValue: 20,
        newValue: 21,
      },
    ],
  ]);

  signal.array[0].id = 0;
  expect(spy).toBeCalledTimes(2);

  signal.array.push({
    id: 3,
    age: 23,
  });
  expect(spy).toBeCalledTimes(2);
});

test("Тестирование эффектов на массивах при изменении родительских данных отсеживаемой части сигнала", () => {
  const signal = createDeepSignal({
    nested: {
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
    },
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.nested.array[0]?.age;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.nested.array[0] = {
    id: 1,
    age: 23,
  };
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested", "array", "0"],
        oldValue: {
          id: 1,
          age: 20,
        },
        newValue: {
          id: 1,
          age: 23,
        },
      },
    ],
  ]);

  signal.nested.array = [];
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.calls[2]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested", "array"],
        oldValue: [
          {
            id: 1,
            age: 23,
          },
          {
            id: 2,
            age: 22,
          },
        ],
        newValue: [],
      },
    ],
  ]);

  signal.nested = {
    array: [],
  };
  expect(spy).toBeCalledTimes(4);
  expect(spy.mock.calls[3]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested"],
        oldValue: {
          array: [],
        },
        newValue: {
          array: [],
        },
      },
    ],
  ]);
});

test("Тестирование эффектов на массивах при изменении дочерних данных отсеживаемой части сигнала", () => {
  const signal = createDeepSignal({
    nested: {
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
    },
  });

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    signal.nested;
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);

  signal.nested.array.push({
    id: 3,
    age: 30,
  });
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested", "array", "2"],
        oldValue: undefined,
        newValue: {
          id: 3,
          age: 30,
        },
      },
    ],
  ]);

  signal.nested.array[1].age = 55;
  expect(spy).toBeCalledTimes(3);
  expect(spy.mock.calls[2]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested", "array", "1", "age"],
        oldValue: 22,
        newValue: 55,
      },
    ],
  ]);

  signal.nested = {
    array: [],
  };
  expect(spy).toBeCalledTimes(4);
  expect(spy.mock.calls[3]).toEqual([
    [
      {
        signalValue: signal,
        path: ["nested"],
        oldValue: {
          array: [
            {
              id: 1,
              age: 20,
            },
            {
              id: 2,
              age: 55,
            },
            {
              id: 3,
              age: 30,
            },
          ],
        },
        newValue: {
          array: [],
        },
      },
    ],
  ]);
});

test("Тестирование эффектов на массивах при различных операциях с ними", () => {
  const signal = createDeepSignal({
    array: [
      {
        id: 1,
        age: 20,
      },
    ],
  });
  const ids: number[] = [];

  const spy = vitest.fn<[DeepEffectCbChange[]]>(() => {
    const ids = signal.array.map((user) => user.id);

    for (const id of ids) {
      ids.push(id);
    }
  });

  createDeepEffect(spy);

  expect(spy).toBeCalledTimes(1);
  expect(spy.mock.calls[0]).toEqual([[]]);
  expect(ids).toEqual([1]);

  signal.array.push({
    id: 2,
    age: 22,
  });
  expect(spy).toBeCalledTimes(2);
  expect(spy.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal,
        path: ["array", "1"],
        oldValue: undefined,
        newValue: {
          id: 2,
          age: 22,
        },
      },
    ],
  ]);
  expect(ids).toEqual([1, 2]);

  signal.array[0].age = 20;
  expect(spy).toBeCalledTimes(2);

  const signal2 = createDeepSignal({
    array: [
      {
        id: 1,
        age: 20,
      },
    ],
  });
  const spy2 = vitest.fn<[DeepEffectCbChange[]]>(() => {
    [...signal2.array];
  });

  createDeepEffect(spy2);

  expect(spy2).toBeCalledTimes(1);
  expect(spy2.mock.calls[0]).toEqual([[]]);

  signal2.array.push({
    id: 3,
    age: 30,
  });
  expect(spy2).toBeCalledTimes(2);
  expect(spy2.mock.calls[1]).toEqual([
    [
      {
        signalValue: signal2,
        path: ["array", "2"],
        oldValue: undefined,
        newValue: {
          id: 3,
          age: 30,
        },
      },
    ],
  ]);
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
