import { test, expect, vitest } from "vitest";
import { createDeepSignal, createDeepEffect, DeepEffectCb } from "../../src/deep-signals";

test("Если в эффекте получить данные из сигнала на один уровень в глубину, а затем установить данные по выбранному ключу, то эффект вызывается", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.count;
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);

  signal.count += 1;
  expect(spyFn).toBeCalledTimes(2);
});

test("Если в эффекте получить данные из сигнала на пять уровней в глубину, а затем установить данные по выбранному ключу, то эффект вызовется один раз", () => {
  const signal = createDeepSignal({
    nested: {
      nested: {
        nested: {
          nested: {
            count: 0,
          },
        },
      },
    },
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested.nested.nested.nested.count;
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);

  signal.nested.nested.nested.nested.count += 1;
  expect(spyFn).toBeCalledTimes(2);
});

test("Если в эффекте получить данные из сигнала, а затем установить для выбранного ключа то же значение, что и до(для непримитивных данных под тем же значением имеется ввиду тот же адрес в памяти), то эффект не вызовется", () => {
  const signal = createDeepSignal({
    count: 0,
    nested: {
      count: 0,
    },
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.count;
  });

  createDeepEffect(spyFn);
  expect(spyFn).toBeCalledTimes(1);
  signal.count = 0;
  expect(spyFn).toBeCalledTimes(1);

  const spyFn2 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested.count;
  });

  createDeepEffect(spyFn2);
  expect(spyFn2).toBeCalledTimes(1);
  signal.nested.count = 0;
  expect(spyFn2).toBeCalledTimes(1);
});

test("Если в эффекте получить данные из сигнала на один уроверь в глубину, а затем установить данные по дочернему пути для использованного в сигнале пути, то эффект вызывается", () => {
  const signal = createDeepSignal({
    nested: {
      count: 0,
    },
    array: [
      {
        id: 1,
      },
    ],
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested;
  });

  createDeepEffect(spyFn);
  expect(spyFn).toBeCalledTimes(1);
  signal.nested.count += 1;
  expect(spyFn).toBeCalledTimes(2);

  const spyFn2 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.array;
  });

  createDeepEffect(spyFn2);
  expect(spyFn2).toBeCalledTimes(1);
  signal.array[0].id = 2;
  expect(spyFn2).toBeCalledTimes(2);
  signal.array.push({
    id: 3,
  });
  expect(spyFn2).toBeCalledTimes(3);
});

test("Если в эффект получить данные из сигнала на три уровня в глубину, а затем установить данные по родительскому пути для использованного в сигнале пути, то эффект вызывается", () => {
  const signal = createDeepSignal({
    nested: {
      count: 0,
    },
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested.count;
  });

  createDeepEffect(spyFn);
  expect(spyFn).toBeCalledTimes(1);
  signal.nested = {
    count: 1,
  };
  expect(spyFn).toBeCalledTimes(2);
});

test("Если в эффект получить данные из сигнала по пути на один уровень в глубину, а затем отдельно получить данные по пути, которых начинается с предыдущего, но идёт на три уровня в глубину, то эффект реагирует только на изменения по первому пути или изменения дочерних данных первого пути", () => {
  const signal = createDeepSignal({
    nested: {
      nested: {
        count: 0,
      },
    },
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested;
    signal.nested.nested.count;
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);
  signal.nested.nested.count += 1;
  expect(spyFn).toBeCalledTimes(2);

  signal.nested.nested = {
    count: 2,
  };
  expect(spyFn).toBeCalledTimes(3);
});

test("Если в эффекте получить данные из двух сигналов, то, при установке данных для любого из сигналов для выбранных ключей, эффект вызывается", () => {
  const signal1 = createDeepSignal({
    count: 0,
  });

  const signal2 = createDeepSignal({
    count: 0,
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal1.count;
    signal2.count;
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);
  signal1.count += 1;
  expect(spyFn).toBeCalledTimes(2);

  signal2.count += 1;
  expect(spyFn).toBeCalledTimes(3);
});

test(" Если несколько эффектов подписаны на один сигнал, то, при установке данных для выбранного ключа, все эффекты будут вызваны", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.count;
  });

  createDeepEffect(spyFn);
  createDeepEffect(spyFn);
  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(3);

  signal.count += 1;
  expect(spyFn).toBeCalledTimes(6);
});

test("Если в эффекте вызывается функция, которая внутри использует данные из сигнала, то при установке данных для выбранного ключа используемого сигнала, эффект вызывается", () => {
  const signal = createDeepSignal({
    count: 0,
  });

  const getCount = () => signal.count;

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    getCount();
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);
  signal.count += 1;
  expect(spyFn).toBeCalledTimes(2);
});

test("Если в эффекте используется несколько сигналов или используется несколько разных путей одного сигнала, до некоторых из которых нельзя дойти при вызове эффекта, то эффект подписывается только на те сигналы или пути, до которых дошёл предыдущий вызов эффекта", () => {
  const signal = createDeepSignal({
    count: 0,
    firstKey: "first",
    secondKey: "second",
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    if (signal.count > 2) {
      signal.firstKey;
    } else {
      signal.secondKey;
    }
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);
  signal.count += 1;
  expect(spyFn).toBeCalledTimes(2);
  signal.firstKey = "first2";
  expect(spyFn).toBeCalledTimes(2);
  signal.secondKey = "second2";
  expect(spyFn).toBeCalledTimes(3);
  signal.count = 3;
  expect(spyFn).toBeCalledTimes(4);
  signal.firstKey = "first3";
  expect(spyFn).toBeCalledTimes(5);
  signal.secondKey = "second3";
  expect(spyFn).toBeCalledTimes(5);
});

test("сли два эффекта подписаны на один сигнал по двум разным путям на несколько уровней в глубину, где первые несколько ключей путей одинаковы, то, при установке данных по одному из путей, эффект, который подписан на другой путь, не вызывается", () => {
  const signal = createDeepSignal({
    nested: {
      nested: {
        nested: {
          count: 0,
        },
        firstKey: "first",
      },
    },
  });

  const spyFn1 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested.nested.nested.count;
  });
  const spyFn2 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.nested.nested.firstKey;
  });

  createDeepEffect(spyFn1);
  createDeepEffect(spyFn2);

  expect(spyFn1).toBeCalledTimes(1);
  expect(spyFn2).toBeCalledTimes(1);

  signal.nested.nested.nested.count = 1;
  expect(spyFn1).toBeCalledTimes(2);
  expect(spyFn2).toBeCalledTimes(1);

  signal.nested.nested.nested = {
    count: 2,
  };
  expect(spyFn1).toBeCalledTimes(3);
  expect(spyFn2).toBeCalledTimes(1);

  signal.nested.nested = {
    nested: {
      count: 3,
    },
    firstKey: "first2",
  };
  expect(spyFn1).toBeCalledTimes(4);
  expect(spyFn2).toBeCalledTimes(2);

  signal.nested.nested.firstKey = "first3";
  expect(spyFn1).toBeCalledTimes(4);
  expect(spyFn2).toBeCalledTimes(3);
});

test("Если в эффекте получить данные в виде массива из сигнала на один уровень в глубину, а затем добавить в массив новый элемент, то эффект вызовется", () => {
  const signal = createDeepSignal({
    array: [
      {
        id: 1,
      },
    ],
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.array;
  });

  createDeepEffect(spyFn);

  expect(spyFn).toBeCalledTimes(1);
  signal.array.push({
    id: 2,
  });
  expect(spyFn).toBeCalledTimes(2);
});

test("Если у данных, которые используются в эффекте, вызывается метод, то эффект подписывается на путь до используемых данных", () => {
  class Figure {
    width = 0;

    getSize() {
      return this.width;
    }
  }

  const signal = createDeepSignal({
    date: new Date(),
    figure: new Figure(),
    array: [
      {
        id: 1,
      },
    ],
  });

  const spyFn = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.date.getTime();
  });

  createDeepEffect(spyFn);
  expect(spyFn).toBeCalledTimes(1);
  signal.date = new Date();
  expect(spyFn).toBeCalledTimes(2);

  const spyFn2 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.figure.getSize();
  });

  createDeepEffect(spyFn2);
  expect(spyFn2).toBeCalledTimes(1);
  signal.figure.width = 10;
  expect(spyFn2).toBeCalledTimes(2);

  const spyFn3 = vitest.fn<Parameters<DeepEffectCb>>(() => {
    signal.array.map(() => {});
  });

  createDeepEffect(spyFn3);
  expect(spyFn3).toBeCalledTimes(1);
  signal.array.push({
    id: 2,
  });
  expect(spyFn3).toBeCalledTimes(2);
  signal.array[1].id = 3;
  expect(spyFn3).toBeCalledTimes(3);
});
