import { createDeepProxy } from "@novakod/deep-proxy";
import { joinPath } from "./utils";

export type DeepEffectCbChange = {
  signalValue: unknown;
  path: (string | symbol)[];
  oldValue: unknown;
  newValue: unknown;
};

export type DeepEffectCb = (changes: DeepEffectCbChange[]) => void;

let currentDeepEffect: DeepEffect | null = null;
let currentBatch: Map<DeepEffect, DeepEffectCbChange[]> | null = null;
let executedBatch: Map<DeepEffect, DeepEffectCbChange[]> | null = null;
let subscriptions: Map<DeepSignal<any>, Map<string, { set: Set<DeepEffect> }>> = new Map();

class DeepSignal<Value extends Record<string, any>> {
  proxifiedValue: Value;
  constructor(value: Value) {
    const thisSignal = this;
    this.proxifiedValue = createDeepProxy(value, {
      get({ target, key, path, reciever }) {
        const joinedPath = joinPath(path);

        let thisSignalSubscriptions = subscriptions.get(thisSignal)!;
        if (!thisSignalSubscriptions) {
          thisSignalSubscriptions = new Map();
          subscriptions.set(thisSignal, thisSignalSubscriptions);
        }

        if (currentDeepEffect) {
          const pathSubscriptions = thisSignalSubscriptions.get(joinedPath);
          if (pathSubscriptions) pathSubscriptions.set.add(currentDeepEffect);
          else thisSignalSubscriptions.set(joinedPath, { set: new Set([currentDeepEffect]) });

          currentDeepEffect.dependencies.add(thisSignal);
        }

        return Reflect.get(target, key, reciever);
      },
      set({ target, key, path, value, reciever }) {
        const oldValue = Reflect.get(target, key, reciever);

        if (Object.is(oldValue, value)) return true;

        const isSet = Reflect.set(target, key, value, reciever);

        if (isSet) {
          const joinedPath = joinPath(path);
          const thisSignalSubscriptions = subscriptions.get(thisSignal);
          const pathSubscriptions = thisSignalSubscriptions?.get(joinedPath);

          pathSubscriptions?.set.forEach((effect, _, effects) => {
            if (effect.isDisposed || !effect.dependencies.has(thisSignal)) effects.delete(effect);
            else effect.runCb([{ signalValue: thisSignal.proxifiedValue, path, oldValue, newValue: value }]);
          });
        }

        return isSet;
      },
    });
  }
}

class DeepEffect {
  private cb: DeepEffectCb;
  dependencies = new Set<DeepSignal<any>>();
  private _isDisposed = false;

  constructor(cb: DeepEffectCb) {
    this.cb = (changes) => {
      this.dependencies.clear();
      currentDeepEffect = this;
      cb(changes);
      currentDeepEffect = null;
    };

    this.runCb([]);
  }

  runCb(changes: DeepEffectCbChange[]) {
    if (currentBatch) {
      if (currentBatch.has(this)) currentBatch.get(this)!.push(...changes);
      else currentBatch.set(this, changes);
    } else this.cb(changes);
  }

  get isDisposed() {
    return this._isDisposed;
  }

  dispose() {
    this._isDisposed = true;
  }
}

export function createDeepSignal<Value extends Record<string, any>>(value: Value): Value {
  const deepSignal = new DeepSignal(value);

  return deepSignal.proxifiedValue;
}

export function createDeepEffect(cb: DeepEffectCb) {
  return new DeepEffect(cb);
}

export function deepBatch(cb: () => void) {
  currentBatch = new Map();
  cb();
  executedBatch = currentBatch;
  currentBatch = null;
  for (const [effect, changes] of executedBatch) effect.runCb([...changes]);
  executedBatch = null;
}
