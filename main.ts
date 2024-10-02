import { createEffect, createSignal } from "./src/new-signals/signal";

const signal = createSignal({
  count: 0,
});

createEffect(() => {
  console.log(`count: ${signal.count}`);
});

document.querySelector("#button1")?.addEventListener("click", () => {
  signal.count += 1;
});
