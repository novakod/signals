import { canBeSignal } from "./utils";

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
        if (key === VALUE_SIGNAL_SYMBOL) {
          return signal;
        }

        const value = Reflect.get(target, key, reciever);

        // Если мы пытаемся получить какой-нибудь метод массива или
        // свойство прототипа объекта, то возвращаем его без проксирования
        // В случае же если value не сущестсвует(т.е., например это индекс массива
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
          // Тогда нужно создать новый объект, добавить туда ключ, на который подписывается эффект
          // и подписать объект на сигнал
          if (!subscribedKeys) {
            const newSubscribedKeys: Map<string | symbol, number> = new Map();
            currentEffect.subscriptions.set(signal, newSubscribedKeys);
            signal.addSubscriber(currentEffect);
            subscribedKeys = newSubscribedKeys;
          }

          // Очень тяжёлая операция, нужно убрать и заменить на геттер
          subscribedKeys.set(key, currentEffect.version);
        }

        if (canBeSignal(value)) {
          let valueSignal = getSignal<object>(value) as Signal<object>;

          if (!valueSignal) {
            const proxiedValue = createSignal(value);

            valueSignal = getSignal<object>(proxiedValue) as Signal<object>;
          }

          if (currentEffect && Array.isArray(value)) {
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

            // Очень тяжёлая операция, нужно убрать и заменить на геттер
            subscribedKeys.set(ANY_KEY_SYMBOL, currentEffect.version);
          }

          return valueSignal.proxy;
        }

        return value;
      },
      set(target, key, newValue, reciever) {
        const isSet = Reflect.set(target, key, newValue, reciever);

        if (Array.isArray(target) && key === "length") {
          return isSet;
        }

        // Если новое значение получилось установить, то нужно
        // оповестить всех подписчиков
        if (isSet) {
          // Походимся по всем подписчикам и вызываем их
          // cb, если версия сигнала соответствует текущей
          // версии
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
    subscriptions: new Map(),
    runCb() {
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
}

export function untrack<Value>(cb: () => Value): Value {
  const temp = currentEffect;
  currentEffect = null;
  const value = cb();
  currentEffect = temp;

  return value;
}

export function batch(cb: () => void) {
  if (currentBatch) {
    cb();
  } else {
    currentBatch = new Set();
    cb();
    const executedBatch = currentBatch;
    currentBatch = null;
    executedBatch.forEach((effect) => effect.runCb());
  }
}
