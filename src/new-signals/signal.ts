import { isCanBeSignal } from "./utils";

export type Effect = {
  // Функция, которая передаётся при создании эффекта
  cb: VoidFunction;
  // Флаг, что эффект больше не активен
  isDisposed: boolean;
  // Функция, которая вызывает эффект
  version: number;
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
  subscribers: Map<Effect, Record<string | symbol, number>>;
};

let currentEffect: Effect | null = null;

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

  const subscribers: Signal<T>["subscribers"] = new Map();

  const signal: Signal<T> = {
    value,
    proxy: new Proxy(value, {
      get(target, key, reciever) {
        if (key === VALUE_SIGNAL_SYMBOL) {
          return signal;
        }
        // Если значение сигнала получают внутри эффекта,
        // то значит нужно подписать эффект на этот сигнал
        if (currentEffect) {
          let subscribedKeys = subscribers.get(currentEffect);

          // Если ээфект вообще не подписан на этот сигнал,
          // то subscribedKeys будет undefined
          // Тогда нужно создать новый объект, добавить туда ключ, на который подписывается эффект
          // и подписать объект на сигнал
          if (!subscribedKeys) {
            const newSubscribedKeys: Record<string | symbol, number> = {};
            subscribers.set(currentEffect, newSubscribedKeys);
            subscribedKeys = newSubscribedKeys;
          }

          subscribedKeys[key] = currentEffect.version;
        }

        const value = Reflect.get(target, key, reciever);

        if (isCanBeSignal(value)) {
          const valueSignal = getSignal<object>(value);

          if (valueSignal) {
            return valueSignal.proxy;
          } else {
            const proxiedValue = createSignal(value);

            const newSignal = getSignal<object>(proxiedValue)!;

            subscribers.forEach((subscribedKeys, effect) => {
              const newSubscribedKeys = {};

              Object.defineProperty(newSubscribedKeys, ANY_KEY_SYMBOL, {
                get() {
                  return subscribedKeys[ANY_KEY_SYMBOL] || (subscribers.get(effect)![key] as number);
                },
              });

              newSignal.subscribers.set(effect, newSubscribedKeys);
            });

            return proxiedValue;
          }
        }

        return value;
      },
      set(target, key, newValue, reciever) {
        const isSet = Reflect.set(target, key, newValue, reciever);

        // Если новое значение получилось установить, то нужно
        // оповестить всех подписчиков
        if (isSet) {
          // Походимся по всем подписчикам и вызываем их
          // cb, если версия сигнала соответствует текущей
          // версии
          subscribers.forEach((subscribedKeys, effect) => {
            if (subscribedKeys[ANY_KEY_SYMBOL] === effect.version || subscribedKeys[key] === effect.version) {
              if (effect.isDisposed) {
                subscribers.delete(effect);
              } else {
                effect.runCb();
              }
            }
          });
        }

        return isSet;
      },
    }),
    subscribers,
  };

  // Устанавливаем для значения созданную ноду по ключу VALUE_SIGNAL_SYMBOL
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

export function createEffect(cb: VoidFunction) {
  const effect: Effect = {
    cb,
    isDisposed: false,
    version: 0,
    runCb() {
      currentEffect = this;
      this.version++;
      this.cb();
      currentEffect = null;
    },
  };

  effect.runCb();
}
