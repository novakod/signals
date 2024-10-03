import { createEffect, createSignal } from "./src/new-signals/signal";

const signal = createSignal({
  nested: {
    nested: {
      count: 0,
    },
  },
  subscribed: true,
});

createEffect(() => {
  console.log("createEffect", Date.now());

  if (signal.subscribed) {
    signal.nested;
  }
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

document.querySelector("#button3")?.addEventListener("click", () => {
  signal.subscribed = !signal.subscribed;
});
