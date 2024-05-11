import { createDeepProxy } from "@novakod/deep-proxy";
import { deepGet, joinPath, startsWith } from "./utils";

type ProxifiedValue = Record<string, any>;
export type DeepEffectCb = VoidFunction;
type SignalSubscriptions = Map<DeepEffect, Map<string, (string | symbol)[]>>;

let currentDeepEffect: DeepEffect | null = null;
let subscriptions: Map<DeepSignal<ProxifiedValue>, SignalSubscriptions> = new Map();

class DeepSignal<Value extends ProxifiedValue> {
  proxifiedValue: Value;
  constructor(value: Value) {
    const thisSignalSubscriptions: SignalSubscriptions = new Map();
    subscriptions.set(this, thisSignalSubscriptions);

    this.proxifiedValue = createDeepProxy(value, {
      get({ target, key, path, reciever }) {
        if (currentDeepEffect && Object.hasOwn(target, key)) {
          const effectSubscriptions = thisSignalSubscriptions.get(currentDeepEffect);

          const prevJoinedPath = joinPath(path.slice(0, -1));
          const joinedPath = prevJoinedPath ? `${prevJoinedPath}.${path[path.length - 1].toString()}` : path[path.length - 1].toString();
          if (effectSubscriptions) {
            effectSubscriptions.delete(prevJoinedPath);
            effectSubscriptions.set(joinedPath, path);
          } else {
            thisSignalSubscriptions.set(currentDeepEffect, new Map([[joinedPath, path]]));
          }
        }

        return Reflect.get(target, key, reciever);
      },
      set({ target, rootTarget, key, path, value, reciever }) {
        const oldValues: Map<DeepEffect, Map<string, any>> = new Map();

        for (const [effect, paths] of thisSignalSubscriptions.entries()) {
          const pathsMap: Map<string, any> = new Map();
          for (const [joinedPath, path] of paths.entries()) {
            const value = deepGet(rootTarget, path);

            pathsMap.set(joinedPath, value);
          }
          oldValues.set(effect, pathsMap);
        }

        const currentPathOldValue = Reflect.get(target, key, reciever);
        const isSet = Reflect.set(target, key, value, reciever);
        const currentPathNewValue = Reflect.get(target, key, reciever);

        if (isSet) {
          const setJoinedPath = joinPath(path);
          for (const [effect, paths] of thisSignalSubscriptions.entries()) {
            for (const [joinedPath, path] of paths.entries()) {
              const value = deepGet(rootTarget, path);

              if (oldValues.get(effect)?.get(joinedPath) !== value || (currentPathOldValue !== currentPathNewValue && startsWith(setJoinedPath, joinedPath))) {
                thisSignalSubscriptions.set(effect, new Map());
                effect.runCb();
              }
            }
          }
        }

        return isSet;
      },
    });
  }
}

class DeepEffect {
  cb: DeepEffectCb;
  constructor(cb: DeepEffectCb) {
    this.cb = () => {
      currentDeepEffect = this;
      cb();
      currentDeepEffect = null;
    };

    this.runCb();
  }

  runCb() {
    this.cb();
  }
}

export function createDeepSignal<Value extends ProxifiedValue>(value: Value): Value {
  const signal = new DeepSignal(value);
  return signal.proxifiedValue;
}

export function createDeepEffect(cb: DeepEffectCb) {
  return new DeepEffect(cb);
}
