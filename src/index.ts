import { createDeepEffect, createDeepSignal } from "./deep-signals";

const signal = createDeepSignal({
  count: 0,
  testField: {
    testField2: 0,
    testField3: {
      count: 0,
      testArray: [1, 2, 3],
    },
  },
});

createDeepEffect(() => {
  console.log("effect1: ", signal.count);
});

createDeepEffect(() => {
  console.log("effect2: ", signal.testField.testField3.count);
});

const button = document.getElementById("button1");

button?.addEventListener("click", () => {
  signal.count = signal.count + 1;
});

const button2 = document.getElementById("button2");

button2?.addEventListener("click", () => {
  signal.testField.testField3.count++;
});

const button3 = document.getElementById("button3");

button3?.addEventListener("click", () => {
  signal.testField.testField3.testArray.push(signal.testField.testField3.testArray.length);
});
