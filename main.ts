import { createDeepEffect, createDeepSignal } from "./src/new2/deep-signals";

const signal = createDeepSignal({
  nested: {
    count: 0,
  },
  array: [
    {
      id: 1,
    },
  ],
});

createDeepEffect(() => {
  signal.array;
});
debugger;
signal.array[0].id = 2;
signal.array.push({
  id: 3,
});
