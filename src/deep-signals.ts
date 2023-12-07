import { createDeepProxy } from "@novakod/deep-proxy";
import { applyObjDiffs, findObjDiffs } from "./utils";

export type DeepEffectCbChange = {
  signalValue: unknown;
  path: (string | symbol)[];
  oldValue: unknown;
  newValue: unknown;
};

export type DeepEffectCb = (changes: DeepEffectCbChange[]) => void;

let currentDeepEffect: DeepEffect | null = null;
let currentBatch: Map<DeepEffect, Set<DeepEffectCbChange>> | null = null;

export class DeepSignal<Value extends object> {
  readonly subscribers: Map<string, Set<DeepEffect>> = new Map();
  readonly proxifiedValue: Value;

  constructor(value: Value) {
    const signal = this;
    this.proxifiedValue = createDeepProxy(value, {
      get({ target, key, path, reciever }) {
        if (currentDeepEffect) currentDeepEffect.addDependency(path.join("."), signal);

        const gotValue = Reflect.get(target, key, reciever);

        return gotValue;
      },
      set({ target, key, path, value, reciever }) {
        const oldValue = Reflect.get(target, key, reciever);

        if (Object.is(oldValue, value)) return true;

        const setResult = Reflect.set(target, key, value, reciever);

        if (setResult) signal.runSubscribers(path, [{ signalValue: signal.proxifiedValue, path, oldValue, newValue: value }]);

        return setResult;
      },
    });
  }

  runSubscribers(path: DeepEffectCbChange["path"], changes: DeepEffectCbChange[]) {
    this.subscribers.get(path.join("."))?.forEach((effect) => effect.runCb(changes));
  }

  subscribe(path: string, effect: DeepEffect) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path)!.add(effect);
  }

  unsubscribe(path: string, effect: DeepEffect) {
    this.subscribers.get(path)?.delete(effect);
  }
}

export function createDeepSignal<Value extends object>(value: Value): Value {
  const signal = new DeepSignal(value);

  return signal.proxifiedValue;
}

export class DeepEffect {
  private deps: Map<string, Set<DeepSignal<any>>> = new Map();
  private cb: DeepEffectCb;

  constructor(cb: DeepEffectCb) {
    this.cb = (params) => {
      currentDeepEffect = this;
      cb(params);
      currentDeepEffect = null;
    };

    this.runCb([{ signalValue: undefined, path: [], newValue: undefined, oldValue: undefined }]);
  }

  runCb(changes: DeepEffectCbChange[]) {
    if (currentBatch) {
      currentBatch.set(this, new Set(currentBatch.has(this) ? [...currentBatch.get(this)!, ...changes] : changes));
    } else this.cb(changes);
  }

  addDependency(path: string, signal: DeepSignal<any>) {
    if (!this.deps.has(path)) {
      this.deps.set(path, new Set());
    }

    this.deps.get(path)!.add(signal);
    signal.subscribe(path, this);
  }

  removeDependency(path: string, signal: DeepSignal<any>) {
    this.deps.get(path)?.delete(signal);

    signal.unsubscribe(path, this);
  }

  dispose() {
    this.deps.forEach((dep, key) => {
      dep.forEach((signal) => {
        signal.unsubscribe(key, this);
      });
    });
  }
}

export function createDeepEffect(cb: DeepEffectCb) {
  return new DeepEffect(cb);
}

export function deepUntracked<Value>(cb: () => Value): Value {
  const currentEffect = currentDeepEffect;
  currentDeepEffect = null;
  const value = cb();
  currentDeepEffect = currentEffect;

  return value;
}

export function deepBatch(cb: () => void) {
  currentBatch = new Map();
  cb();
  const batch = currentBatch;
  currentBatch = null;
  for (const [effect, changes] of batch) effect.runCb([...changes]);
}

export function deepCompute<Value extends object>(cb: () => Value): Value {
  let value: Value = {} as Value;
  let signal: Value = {} as Value;
  createDeepEffect(() => {
    const newValue = cb();

    const diffs = findObjDiffs(value, newValue);
    applyObjDiffs(signal, diffs);
    value = newValue;
  });
  signal = createDeepSignal(value);

  return signal;
}
