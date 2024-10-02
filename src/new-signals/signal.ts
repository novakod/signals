import { isCanBeSignal } from "./utils";

export type Effect = {
  // Функция, которая передаётся при создании эффекта
  cb: VoidFunction;
  // Флаг, что эффект больше не активен
  isDisposed: boolean;
  // Функция, которая вызывает эффект
  runCb(): void;
};

export type Node<T extends object> = {
  // Исходное значение, с которым работает сигнал
  value: T;
  // Прокси значения
  proxy: T;
  // Версия сигнала
  version: number;
  // Список подписчиков
  // В ключе лежит эффект, а в значении по ключу лежит объект,
  // где ключ - это ключ сигнала, а значение - версия сигнала, на которую он подписан
  // При установке нового значения сигнала список эффектов итерируется
  // и эффект вызывается, если версия сигнала, на которую он подписан, соответствует
  // текущей версии сигнала. После итерации списка подписчиков версия сигнала увеличивается
  subscribers: Map<Effect, Record<string | symbol, number>>;
};

let currentEffect: Effect | null = null;

const VALUE_NODE_SYMBOL = Symbol.for("SIGNAL_VALUE_NODE_SYMBOL");

export function createSignal<T extends object>(value: T): T {
  // Если значение не объект, а, к примеру, строка или число,
  // то оно не может быть сигналом
  if (!isCanBeSignal(value)) {
    console.warn(`Значение ${value} не может быть сигналом`);
    return value;
  }

  const existingNode = value[VALUE_NODE_SYMBOL as keyof T] as Node<T> | undefined;

  // Если для этого значения сигнал уже существует,
  // то он указан по ключу VALUE_NODE_SYMBOL.
  // Тогда просто возвращаем прокси сущесовующего сигнала
  // и не создаём новый сигнал
  if (existingNode) {
    return existingNode.proxy;
  }

  const subscribers: Node<T>["subscribers"] = new Map();

  const node: Node<T> = {
    value,
    proxy: new Proxy(value, {
      get(target, key) {
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

          subscribedKeys[key] = node.version;
        }

        return Reflect.get(target, key);
      },
      set(target, key, newValue, reciever) {
        const isSet = Reflect.set(target, key, newValue, reciever);

        // Если новое значение получилось установить, то нужно
        // оповестить всех подписчиков
        if (isSet) {
          const currentNodeVersion = node.version;

          // Увеличиваем версию сигнала
          node.version++;

          // Походимся по всем подписчикам и вызываем их
          // cb, если версия сигнала соответствует текущей
          // версии
          subscribers.forEach((subscribedKeys, effect) => {
            if (subscribedKeys[key] === currentNodeVersion) {
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
    version: 0,
    subscribers,
  };

  // Устанавливаем для значения созданную ноду по ключу VALUE_NODE_SYMBOL
  // Если попытаться создать новый сигнал для этого значения, то
  // вернётся прокси уже созданного сигнала
  Object.defineProperty(value, VALUE_NODE_SYMBOL, {
    value: node,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return node.proxy;
}

export function createEffect(cb: VoidFunction) {
  const effect = {
    cb,
    isDisposed: false,
    runCb() {
      currentEffect = this;
      this.cb();
      currentEffect = null;
    },
  };

  effect.runCb();
}
