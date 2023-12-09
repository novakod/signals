import { createDeepProxy } from "@novakod/deep-proxy";
import { Diff, applyObjDiffs, findObjDiffs } from "./utils";

export type DeepEffectCbChange = {
  signalValue: unknown;
  path: (string | symbol)[];
  oldValue: unknown;
  newValue: unknown;
};

export type DeepEffectCb = (changes: DeepEffectCbChange[]) => void;

export type DeepComputeResultCbChange = Diff;

export type DeepComputeCb<Value extends object> = (changes: DeepEffectCbChange[]) => Value;

export type DeepComputeResultCb = (computeChanges: DeepComputeResultCbChange[], effectChanges: DeepEffectCbChange[]) => void;

let currentDeepEffect: DeepEffect | null = null;
let currentBatch: Map<DeepEffect, Set<DeepEffectCbChange>> | null = null;

export class DeepSignal<Value extends object> {
  readonly subscribers: Map<string, Set<DeepEffect>> = new Map();
  readonly proxifiedValue: Value;

  constructor(value: Value) {
    const signal = this;
    this.proxifiedValue = createDeepProxy(value, {
      get({ target, key, path, reciever }) {
        if (currentDeepEffect) {
          signal.subscribe(path, currentDeepEffect);
          currentDeepEffect.addDependency(signal);
        }

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

  subscribe(path: DeepEffectCbChange["path"], effect: DeepEffect) {
    const joinedPath = path.join(".");
    if (!this.subscribers.has(joinedPath)) {
      this.subscribers.set(joinedPath, new Set());
    }

    this.subscribers.get(joinedPath)!.add(effect);
  }

  unsubscribe(effect: DeepEffect) {
    this.subscribers.forEach((set) => set.delete(effect));
  }
}

export function createDeepSignal<Value extends object>(value: Value): Value {
  const signal = new DeepSignal(value);

  return signal.proxifiedValue;
}

export class DeepEffect {
  private deps: Set<DeepSignal<any>> = new Set();
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

  addDependency(signal: DeepSignal<any>) {
    this.deps.add(signal);
  }

  removeDependency(signal: DeepSignal<any>) {
    this.deps.delete(signal);
  }

  dispose() {
    this.deps.forEach((signal) => {
      signal.unsubscribe(this);
    });
    this.deps.clear();
  }
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
  const batch = currentBatch;
  currentBatch = null;
  for (const [effect, changes] of batch) effect.runCb([...changes]);
}

export function deepCompute<Value extends object>(cb: DeepComputeCb<Value>, result?: DeepComputeResultCb): Value {
  let value: Value = {} as Value;
  let signal: Value = {} as Value;
  createDeepEffect((changes) => {
    const newValue = cb(changes);

    const diffs = findObjDiffs(value, newValue);
    deepBatch(() => {
      applyObjDiffs(signal, diffs);
    });
    value = newValue;
    result?.(diffs, changes);
  });
  signal = createDeepSignal(value);

  return signal;
}
