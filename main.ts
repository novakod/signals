import { createEffect, createSignal } from "./src/new-signals/signal";

const signal = createSignal({
  nested: {
    nested: {
      count: 0,
    },
  },
});

createEffect(() => {
  console.log("count: ", signal.nested);
});

document.querySelector("#button1")?.addEventListener("click", () => {
  signal.nested.nested.count += 1;
});

document.querySelector("#button2")?.addEventListener("click", () => {
  signal.nested = {
    nested: {
      count: signal.nested.nested.count + 1,
    },
  };
});
