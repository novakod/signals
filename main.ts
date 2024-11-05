import { batch, createEffect, createSignal, trackNested } from "./src/signals";

const signal = createSignal({
  items: Array.from({ length: 1000 }).map((_, i) => ({
    id: i,
    name: `Item ${i}`,
    friends: ["Sam", "Bob", "Jen", "Jim"],
    map: {} as any,
  })),
});

const dispose = createEffect(() => {
  console.log("createEffect", Date.now());

  trackNested(signal.items, 1);
}, true);

document.querySelector("#button1")?.addEventListener("click", () => {
  signal.items.pop();
});

document.querySelector("#button2")?.addEventListener("click", () => {
  dispose();
});

document.querySelector("#button3")?.addEventListener("click", () => {
  signal.items.push({
    id: 4,
    name: "Item 4",
    friends: ["Sam"],
    map: {} as any,
  });
});

batch(() => {});
