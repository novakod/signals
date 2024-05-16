import { createDeepProxy } from "@novakod/deep-proxy";
import { deepGet, joinPath, startsWith } from "./utils";

type ProxifiedValue = Record<string, any>;
export type DeepEffectCbChange = {
  signalValue: unknown;
  path: (string | symbol)[];
  oldValue: unknown;
  newValue: unknown;
};
export type DeepEffectCb = (changes: DeepEffectCbChange[]) => void;
type SignalSubscriptions = Map<DeepEffect, Map<string, (string | symbol)[]>>;

let currentDeepEffect: DeepEffect | null = null;
let subscriptions: Map<DeepSignal<ProxifiedValue>, SignalSubscriptions> = new Map();
let currentBatch: Map<DeepEffect, Set<DeepEffectCbChange>> | null = null;
let executedBatch: Map<DeepEffect, Set<DeepEffectCbChange>> | null = null;

export class DeepSignal<Value extends ProxifiedValue> {
  proxifiedValue: Value;
  constructor(value: Value) {
    const thisSignal = this;

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
            if (effect.isDisposed) {
              thisSignalSubscriptions.delete(effect);
              continue;
            }

            for (const [joinedPath, path] of paths.entries()) {
              const value = deepGet(rootTarget, path);

              if (oldValues.get(effect)?.get(joinedPath) !== value || (currentPathOldValue !== currentPathNewValue && startsWith(setJoinedPath, joinedPath))) {
                thisSignalSubscriptions.set(effect, new Map());
                effect.runCb([{ signalValue: thisSignal.proxifiedValue, path, oldValue: currentPathOldValue, newValue: currentPathNewValue }]);
              }
            }
          }
        }

        return isSet;
      },
    });
  }
}

export class DeepEffect {
  cb: DeepEffectCb;
  private _isDisposed = false;

  constructor(cb: DeepEffectCb) {
    this.cb = (changes) => {
      currentDeepEffect = this;
      cb(changes);
      currentDeepEffect = null;
    };

    this.runCb([]);
  }

  get isDisposed() {
    return this._isDisposed;
  }

  runCb(changes: DeepEffectCbChange[]) {
    if (currentBatch) {
      currentBatch.set(this, new Set(currentBatch.has(this) ? [...currentBatch.get(this)!, ...changes] : changes));
    } else this.cb(changes);
  }

  dispose() {
    this._isDisposed = true;
  }
}

export function createDeepSignal<Value extends ProxifiedValue>(value: Value): Value {
  const signal = new DeepSignal(value);
  return signal.proxifiedValue;
}

export function createDeepEffect(cb: DeepEffectCb) {
  return new DeepEffect(cb);
}

export function deepUntrack<Value>(cb: () => Value): Value {
  const currentEffect = currentDeepEffect;
  currentDeepEffect = null;
  const value = cb();
  currentDeepEffect = currentEffect;

  return value;
}

export function deepBatch(cb: () => void) {
  currentBatch = new Map();
  cb();
  executedBatch = currentBatch;
  currentBatch = null;
  for (const [effect, changes] of executedBatch) effect.runCb([...changes]);
  executedBatch = null;
}
