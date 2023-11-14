import { createEffect, createSignal } from "./signals";

const counter1 = createSignal(42);
const counter2 = createSignal(10);

const effect1 = createEffect(() => {
  console.log("counter1: ", counter1.value);
  //   if (counter1.value < 300) counter1.value += 1;
});

const effect2 = createEffect(() => {
  console.log("counter2: ", counter2.value);
});

const button1 = document.querySelector("#button1");
const button2 = document.querySelector("#button2");
const button3 = document.querySelector("#button3");

button1?.addEventListener("click", () => {
  counter1.value += 1;
});

button2?.addEventListener("click", () => {
  counter2.value += 1;
});

button3?.addEventListener("click", () => {
  effect1.dispose();
  effect2.dispose();
});
