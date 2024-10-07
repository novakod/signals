import { Suite } from "benchmark";
import { createEffect, createSignal } from "../src/signals";

const suite = new Suite();

const getData = () => ({
  count: 0,
  users: Array.from({ length: 10000 }).map((_, i) => ({
    id: i,
    name: `User ${i}`,
  })),
});

const signal = createSignal(getData());

for (let i = 0; i < 100; i++) {
  createEffect(() => {
    signal.users;
  });
}

suite
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .add("createDeepSignal", () => {
    // signal.users.push({ id: signal.users.length, name: "test" });

    signal.users[0].name = "test";
  })
  .run({
    async: true,
  });
