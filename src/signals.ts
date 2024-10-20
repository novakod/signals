import { canBeSignal } from "./utils";
import { isPureObject } from "@novakod/is-pure-object";

export type Effect = {
  // Функция, которая передаётся при создании эффекта
  cb: VoidFunction;
  // Флаг, что эффект больше не активен
  isDisposed: boolean;
  // Функция, которая вызывает эффект
  version: number;
  subscriptions: Map<Signal<object>, Map<string | symbol, number>>;
  runCb(): void;
};

export type Signal<T extends object> = {
  // Исходное значение, с которым работает сигнал
  value: T;
  // Прокси значения
  proxy: T;
  // Список подписчиков
  // В ключе лежит эффект, а в значении по ключу лежит объект,
  // где ключ - это ключ сигнала, а значение - версия сигнала, на которую он подписан
  // При установке нового значения сигнала список эффектов итерируется
  // и эффект вызывается, если версия сигнала, на которую он подписан, соответствует
  // текущей версии сигнала. После итерации списка подписчиков версия сигнала увеличивается
  subscribers?: Set<Effect>;
  addSubscriber(effect: Effect): void;
};

let currentEffect: Effect | null = null;
let currentBatch: Set<Effect> | null = null;

const VALUE_SIGNAL_SYMBOL = Symbol.for("VALUE_SIGNAL");
const ANY_KEY_SYMBOL = Symbol.for("ANY_KEY");

function getSignal<Value extends object>(value: Value): Signal<Value> | undefined {
  return value[VALUE_SIGNAL_SYMBOL as keyof typeof value] as Signal<Value> | undefined;
}

export function createSignal<T extends object>(value: T): T {
  const existingSignal = getSignal(value);

  // Если для этого значения сигнал уже существует,
  // то он указан по ключу VALUE_SIGNAL_SYMBOL.
  // Тогда просто возвращаем прокси сущесовующего сигнала
  // и не создаём новый сигнал
  if (existingSignal) {
    return existingSignal.proxy;
  }

  const signal: Signal<T> = {
    value,
    proxy: new Proxy(value, {
      get(target, key, reciever) {
        // Если получаем ключ VALUE_SIGNAL_SYMBOL, то возвращаем сигнал
        if (key === VALUE_SIGNAL_SYMBOL) {
          return signal;
        }

        const value = Reflect.get(target, key, reciever);

        // Если мы пытаемся получить какой-нибудь метод массива или
        // свойство прототипа объекта, то возвращаем его без проксирования
        // В случае же если value не существует(т.е., например это индекс массива
        // значения по которому пока нет), то подписываем эффект на текущий
        // сигнал по ключу key в надежде, что в будущем значение по этому
        // ключу появится в сигнале
        if ((value && !Object.hasOwn(target, key)) || (key === "length" && Array.isArray(target))) {
          return value;
        }

        // Если значение сигнала получают внутри эффекта,
        // то значит нужно подписать эффект на этот сигнал
        if (currentEffect) {
          let subscribedKeys = currentEffect.subscriptions.get(signal);

          // Если ээфект вообще не подписан на этот сигнал,
          // то subscribedKeys будет undefined
          // Тогда нужно создать новый Map, добавить туда ключ, на который подписывается эффект
          // и подписать эффект на сигнал
          if (!subscribedKeys) {
            const newSubscribedKeys: Map<string | symbol, number> = new Map();
            currentEffect.subscriptions.set(signal, newSubscribedKeys);
            signal.addSubscriber(currentEffect);
            subscribedKeys = newSubscribedKeys;
          }

          subscribedKeys.set(key, currentEffect.version);
        }

        // Если значение может быть сигналом, т е оно не является примитивом,
        // то просто возвращаем его без проксирования
        if (canBeSignal(value)) {
          let valueSignal = getSignal<object>(value) as Signal<object>;

          // Если для этого значения сигнал ешё не был создан,
          // то создаем новый сигнал
          if (!valueSignal) {
            const proxiedValue = createSignal(value);

            valueSignal = getSignal<object>(proxiedValue) as Signal<object>;
          }

          // Если это массив, то, так как ключи массива динамические, то
          //  нам нужно подписать эффект на сигнал этого массива по ANY_KEY_SYMBOL
          if (currentEffect) {
            let subscribedKeys = currentEffect.subscriptions.get(valueSignal);

            // Если ээфект вообще не подписан на этот сигнал,
            // то subscribedKeys будет undefined
            // Тогда нужно создать новый объект, добавить туда ключ, на который подписывается эффект
            // и подписать объект на сигнал
            if (!subscribedKeys) {
              const newSubscribedKeys: Map<string | symbol, number> = new Map();
              currentEffect.subscriptions.set(valueSignal, newSubscribedKeys);
              valueSignal.addSubscriber(currentEffect);
              subscribedKeys = newSubscribedKeys;
            }

            subscribedKeys.set(ANY_KEY_SYMBOL, currentEffect.version);
          }

          return valueSignal.proxy;
        }

        return value;
      },
      set(target, key, newValue, reciever) {
        // Установку длинны массива нужно проигнорировать
        // в случае, если новая длина больше текущей, так как такая
        // длина устанавливается после добавляется элемента в массив.
        // Если же новая длина меньше текущей, то операцию игнорировать
        // не нужно
        if (key === "length" && Array.isArray(target)) {
          const currentLength = Reflect.get(target, "length", reciever);

          if (newValue >= currentLength) {
            return Reflect.set(target, key, newValue, reciever);
          }
        }

        const isSet = Reflect.set(target, key, newValue, reciever);

        // Если новое значение получилось установить, то нужно
        // оповестить всех подписчиков
        if (isSet) {
          // Походимся по всем подписчикам и вызываем их
          // cb, если версия сигнала соответствует текущей
          // версии эффекта
          signal.subscribers?.forEach((effect) => {
            const currentSignalSubscriptions = effect.subscriptions.get(signal);
            if (currentSignalSubscriptions?.get(ANY_KEY_SYMBOL) === effect.version || currentSignalSubscriptions?.get(key) === effect.version) {
              if (effect.isDisposed) {
                signal.subscribers?.delete(effect);
                effect.subscriptions.delete(signal);
              } else {
                effect.runCb();
              }
            }
          });
        }

        return isSet;
      },
    }),
    subscribers: undefined,
    addSubscriber(effect: Effect) {
      if (!this.subscribers) {
        this.subscribers = new Set();
      }

      this.subscribers.add(effect);
    },
  };

  // Устанавливаем для значения созданный сигнал по ключу VALUE_SIGNAL_SYMBOL
  // Если попытаться создать новый сигнал для этого значения, то
  // вернётся прокси уже созданного сигнала
  Object.defineProperty(value, VALUE_SIGNAL_SYMBOL, {
    value: signal,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return signal.proxy;
}

/**
 * Функция позволяет отслеживать изменения сигналов, которые
 * были использованы внутри эффекта
 * @example
 * const signal = createSignal({
 *   count: 0
 * });
 *
 * const dispose = createEffect(() => {
 *   console.log('count: ', signal.count);
 * })
 *
 * signal.count++;
 * // Вывод: count: 1
 *
 * dispose();
 * @param cb - функция, использованные сигналы внутри которой будут отслеживаться
 * @returns функция для отмены отслеживания
 */
export function createEffect(cb: VoidFunction): VoidFunction {
  const effect: Effect = {
    cb,
    isDisposed: false,
    version: 0,
    subscriptions: new Map(),
    runCb() {
      // Если запущен батчинг, то нужно отложить вызов эффектов
      // до тех пор пока батчинг не закончится
      if (currentBatch) {
        currentBatch.add(this);
      } else {
        currentEffect = this;
        this.version++;
        this.cb();
        currentEffect = null;
      }
    },
  };

  effect.runCb();

  return () => {
    effect.isDisposed = true;
  };
}

/**
 * Функция позволяет не отслеживать сигналы внутри эффектов
 * @param cb - функция, которая возвращает значение
 * @returns Полученное в cb значение
 */
export function untrack<Value>(cb: () => Value): Value {
  const temp = currentEffect;
  currentEffect = null;
  const value = cb();
  currentEffect = temp;

  return value;
}

/**
 * Функция позволяет аккумулировать изменения и не вызывать эффекты не многократно,
 * что происходило бы при каждом изменении, а единожды после выполнения функции
 * @example
 * Подписанные эффекты вызовутся только один раз, а не два
 * batch(() => {
 *   signal.items.push({
 *     id: Date.now(),
 *   })
 *   signal.items.push({
 *     id: Date.now(),
 *   })
 * })
 * @param cb - функция, внутри которой нужно устанавливать эначения сигналов
 */
export function batch(cb: () => void) {
  if (currentBatch) {
    cb();
  } else {
    currentBatch = new Set();
    cb();
    const executedBatch = currentBatch;
    currentBatch = null;
    executedBatch.forEach((effect) => {
      if (effect.isDisposed) {
        effect.subscriptions.forEach((_, signal) => {
          signal.subscribers?.delete(effect);
        });
        effect.subscriptions.clear();
      } else {
        effect.runCb();
      }
    });
  }
}

/**
 * Функция позволяет получить значение, которое проксируется внутри сигнала
 * @param value Прокси, значение которого нужно получить
 * @returns значение без прокси
 */
export function getSignalValue<Value>(value: Value): Value {
  if (canBeSignal(value)) {
    const signal = getSignal(value);

    return signal?.value ?? value;
  }

  return value;
}

type TrackNestedOptions = {
  depth?: number;
};

const trackNestedDefaultOptions: TrackNestedOptions = {};

function _trackNested<Value>(value: Value, options: TrackNestedOptions = trackNestedDefaultOptions, currentDepth = 0): Value {
  if (options.depth && currentDepth >= options.depth) {
    return value;
  }

  if (canBeSignal(value)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        _trackNested(value[i], options, currentDepth + 1);
      }
    } else if (isPureObject(value)) {
      for (const key in value) {
        _trackNested(value[key], options, currentDepth + 1);
      }
    }
  }

  return value;
}

/**
 * Функция позволяет реализовать глубокое отслеживание сигналов
 * @example
 * Без использования trackNested отследить изменение users[0].name было бы невозможно
 * createEffect(() => {
 *   trackNested(signal.users);
 * })
 *
 * signal.users[0].name = "test";
 * @param value Прокси, значение которого нужно отслеживать
 * @param options Настройки отслеживания
 * @param options.depth Глубина отслеживания. Если не указано, то отслеживание будет производиться до бесконечности
 * @returns переданное в первом агрументе значение
 */
export function trackNested<Value>(value: Value, options?: TrackNestedOptions): Value {
  return _trackNested(value, options);
}
