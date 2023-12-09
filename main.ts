import { DeepEffect, DeepSignal, createDeepEffect, createDeepSignal, deepUntrack } from "./src/deep-signals";

// debugger;
const signal = new DeepSignal({
  array: [
    {
      id: 1,
      age: 20,
    },
    {
      id: 2,
      age: 22,
    },
  ],
});

const effect = new DeepEffect((changes) => {
  console.log("effect: ", signal.proxifiedValue.array, changes);
});

signal.proxifiedValue.array[0].age = 21;

signal.proxifiedValue.array[0] = {
  id: 0,
  age: 21,
};

window["signal"] = signal;
