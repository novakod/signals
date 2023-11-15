type EffectCb = () => void;

let currentEffect: Effect | null = null;

class Signal<Value> {
  private subscribers: Set<VoidFunction> = new Set();

  constructor(private _value: Value) {}

  get value() {
    if (currentEffect) currentEffect.addDependency(this);
    return this._value;
  }

  set value(value: Value) {
    if (Object.is(this._value, value)) return;

    this._value = value;
    this.runSubscribers();
  }

  private runSubscribers() {
    this.subscribers.forEach((subscriber) => subscriber());
  }

  subscribe(cb: VoidFunction) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: VoidFunction) {
    this.subscribers.delete(cb);
  }
}

class Effect {
  private deps: Set<Signal<unknown>> = new Set();
  private cb: EffectCb;

  constructor(cb: EffectCb) {
    this.cb = () => {
      currentEffect = this;
      cb();
      currentEffect = null;
    };
    this.cb();
  }

  dispose() {
    this.deps.forEach((dep) => this.removeDependency(dep));
  }

  addDependency(signal: Signal<unknown>) {
    this.deps.add(signal);
    signal.subscribe(this.cb);
  }

  removeDependency(signal: Signal<unknown>) {
    this.deps.delete(signal);
    signal.unsubscribe(this.cb);
  }
}

export function createSignal<Value>(value: Value) {
  return new Signal(value);
}

export function createEffect(cb: EffectCb) {
  return new Effect(cb);
}
