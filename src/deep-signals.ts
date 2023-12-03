import { createDeepProxy } from "@novakod/deep-proxy";

type DeepEffectCb = (path: (string | symbol)[]) => void;

let currentDeepEffect: DeepEffect | null = null;

export class DeepSignal<Value extends object> {
  private subscribers: Map<string, Set<DeepEffectCb>> = new Map();
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
        if (Object.is(target[key], value)) return true;

        const setResult = Reflect.set(target, key, value, reciever);

        if (setResult) signal.runSubscribers(path);

        return setResult;
      },
    });
  }

  runSubscribers(path: Parameters<DeepEffectCb>[0]) {
    this.subscribers.get(path.join("."))?.forEach((subscriber) => subscriber(path));
  }

  subscribe(path: string, cb: DeepEffectCb) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path)!.add(cb);
  }

  unsubscribe(path: string, cb: DeepEffectCb) {
    this.subscribers.get(path)?.delete(cb);
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
    this.cb = (path) => {
      currentDeepEffect = this;
      cb(path);
      currentDeepEffect = null;
    };
    this.cb([]);
  }

  addDependency(path: string, signal: DeepSignal<any>) {
    if (!this.deps.has(path)) {
      this.deps.set(path, new Set());
    }

    this.deps.get(path)!.add(signal);
    signal.subscribe(path, this.cb);
  }

  removeDependency(path: string, signal: DeepSignal<any>) {
    this.deps.get(path)?.delete(signal);

    signal.unsubscribe(path, this.cb);
  }

  dispose() {
    this.deps.forEach((dep, key) => {
      dep.forEach((signal) => {
        signal.unsubscribe(key, this.cb);
      });
    });
  }
}

export function createDeepEffect(cb: DeepEffectCb) {
  return new DeepEffect(cb);
}
