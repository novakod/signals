import { Suite } from "benchmark";
import { createDeepEffect, createDeepSignal } from "./../src/deep-signals";

const suite = new Suite();

const getData = () => ({
  count: 0,
  users: Array.from({ length: 1000 }).map((_, i) => ({
    id: i,
    name: `User ${i}`,
  })),
});

const signal = createDeepSignal(getData());

for (let i = 0; i < 100; i++) {
  createDeepEffect(() => {
    signal.users;
  });
}

suite
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .add("createDeepSignal", () => {
    signal.users.push({ id: signal.users.length, name: "test" });
  })
  .run({
    async: true,
  });
