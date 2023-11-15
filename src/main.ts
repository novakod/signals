import { createEffect, createSignal } from "./signals";

// debugger;
const signal1 = createSignal(0);
const signal2 = createSignal(0);

createEffect(() => {
  if (signal1.value < 2) {
    console.log("1");
  } else if (signal2.value >= 0) {
    console.log("2");
  }
});

signal1.value = 2;

signal2.value = 5;
