import { createDeepProxy } from "@novakod/deep-proxy";

let currentDeepEffect: DeepEffect | null = null;

class DeepSignal<Value extends object> {
  private subscribers: Map<string, Set<VoidFunction>> = new Map();
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

        if (setResult) signal.runSubscribers(path.join("."));

        return setResult;
      },
    });
  }

  runSubscribers(path: string) {
    this.subscribers.get(path)?.forEach((subscriber) => subscriber());
  }

  subscribe(path: string, cb: VoidFunction) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path)!.add(cb);
  }

  unsubscribe(path: string, cb: VoidFunction) {
    this.subscribers.get(path)?.delete(cb);
  }
}

export function createDeepSignal<Value extends object>(value: Value): Value {
  const signal = new DeepSignal(value);

  return signal.proxifiedValue;
}

class DeepEffect {
  private deps: Map<string, Set<DeepSignal<any>>> = new Map();
  private cb: VoidFunction;

  constructor(cb: VoidFunction) {
    this.cb = () => {
      currentDeepEffect = this;
      cb();
      currentDeepEffect = null;
    };
    this.cb();
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

export function createDeepEffect(cb: VoidFunction) {
  return new DeepEffect(cb);
}
