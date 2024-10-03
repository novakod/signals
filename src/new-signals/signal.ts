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

export function createSignal<T extends object>(value: T): T {
  const existingSignal = value[VALUE_SIGNAL_SYMBOL as keyof T] as Signal<T> | undefined;

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
          return createSignal(value);
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
            if (subscribedKeys[key] === effect.version) {
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
