import { expect, test } from "vitest";
import { Diff, applyObjDiffs, findObjDiffs } from "../src/utils";

test("Тестирование функции findObjDiffs", () => {
  const obj1 = { a: 1, b: 2, c: 3 };
  const obj2 = { a: 1, b: 2, c: 3 };
  expect(findObjDiffs(obj1, obj2)).toEqual([]);

  const obj3 = { a: 1, b: 2, c: 3 };
  const obj4 = { a: 1, b: 2, c: 4 };
  expect(findObjDiffs(obj3, obj4)).toEqual([
    {
      path: ["c"],
      type: "changed",
      oldValue: 3,
      newValue: 4,
    },
  ]);

  const obj5 = { a: 1, b: 2, c: 3 };
  const obj6 = {
    a: 1,
    b: 2,
    c: {
      d: [],
    },
  };
  expect(findObjDiffs(obj5, obj6)).toEqual([
    {
      path: ["c"],
      type: "changed",
      oldValue: 3,
      newValue: { d: [] },
    },
  ]);

  const obj7 = {};
  const obj8 = [];
  expect(findObjDiffs(obj7, obj8)).toEqual([]);

  const obj9 = { a: { b: "test" } };
  const obj10 = { a: [] };
  expect(findObjDiffs(obj9, obj10)).toEqual([
    {
      path: ["a"],
      type: "changed",
      oldValue: { b: "test" },
      newValue: [],
    },
  ]);

  const obj11 = { a: [{ b: "test" }] };
  const obj12 = { a: [{ b: "test2" }] };
  expect(findObjDiffs(obj11, obj12)).toEqual([
    {
      path: ["a", 0, "b"],
      type: "changed",
      oldValue: "test",
      newValue: "test2",
    },
  ]);

  const obj13 = { a: [{ b: "test" }, { b: "test2" }] };
  const obj14 = { a: [{ b: "test" }] };
  expect(findObjDiffs(obj13, obj14)).toEqual([
    {
      path: ["a", 1],
      type: "removed",
      oldValue: { b: "test2" },
      newValue: undefined,
    },
  ]);

  const obj15 = { a: [{ b: "test" }] };
  const obj16 = { a: [{ b: "test" }, { b: "test2" }] };
  expect(findObjDiffs(obj15, obj16)).toEqual([
    {
      path: ["a", 1],
      type: "added",
      oldValue: undefined,
      newValue: { b: "test2" },
    },
  ]);

  const obj17 = { a: [{ b: "test" }] };
  const obj18 = { a: [{ b: "test2" }], b: "test" };
  expect(findObjDiffs(obj17, obj18)).toEqual([
    {
      path: ["a", 0, "b"],
      type: "changed",
      oldValue: "test",
      newValue: "test2",
    },
    {
      path: ["b"],
      type: "added",
      oldValue: undefined,
      newValue: "test",
    },
  ]);

  const obj19 = { a: [{ b: "test" }], b: "test" };
  const obj20 = { a: [{ b: "test2" }], c: "test" };

  expect(findObjDiffs(obj19, obj20)).toEqual([
    {
      path: ["a", 0, "b"],
      type: "changed",
      oldValue: "test",
      newValue: "test2",
    },
    {
      path: ["b"],
      type: "removed",
      oldValue: "test",
      newValue: undefined,
    },
    {
      path: ["c"],
      type: "added",
      oldValue: undefined,
      newValue: "test",
    },
  ]);

  const obj21 = { a: [{ b: "test" }], b: ["test"] };
  const obj22 = { a: [{ b: "test2" }], c: "test" };
  expect(findObjDiffs(obj21, obj22)).toEqual([
    {
      path: ["a", 0, "b"],
      type: "changed",
      oldValue: "test",
      newValue: "test2",
    },
    {
      path: ["b"],
      type: "removed",
      oldValue: ["test"],
      newValue: undefined,
    },
    {
      path: ["c"],
      type: "added",
      oldValue: undefined,
      newValue: "test",
    },
  ]);

  const obj23 = { a: new Date() };
  const obj24 = { a: new Date() };
  expect(findObjDiffs(obj23, obj24)).toEqual([
    {
      path: ["a"],
      type: "changed",
      oldValue: obj23.a,
      newValue: obj24.a,
    },
  ]);

  const obj25 = { a: new Map() };
  const obj26 = { a: new Map() };
  expect(findObjDiffs(obj25, obj26)).toEqual([
    {
      path: ["a"],
      type: "changed",
      oldValue: obj25.a,
      newValue: obj26.a,
    },
  ]);

  const date = new Date();
  const obj27 = { a: date };
  const obj28 = { a: date };
  expect(findObjDiffs(obj27, obj28)).toEqual([]);

  const map = new Map();
  const obj29 = { a: map };
  map.set("a", 1);
  const obj30 = { a: map };
  expect(findObjDiffs(obj29, obj30)).toEqual([]);
});

test("Тестирование функции applyObjDiffs", () => {
  const obj = { a: 1 };
  const diffs: Diff[] = [];
  applyObjDiffs(obj, diffs);
  expect(obj).toEqual({
    a: 1,
  });

  const obj2 = { a: 1 };
  const diffs2: Diff[] = [
    {
      path: ["a"],
      type: "changed",
      oldValue: 1,
      newValue: 2,
    },
  ];
  applyObjDiffs(obj2, diffs2);
  expect(obj2).toEqual({
    a: 2,
  });

  const obj3 = { a: 1 };
  const diffs3: Diff[] = [
    {
      path: ["a"],
      type: "removed",
      oldValue: 1,
      newValue: undefined,
    },
  ];
  applyObjDiffs(obj3, diffs3);
  expect(obj3).toEqual({});

  const obj4 = { a: 1 };
  const diffs4: Diff[] = [
    {
      path: ["b"],
      type: "added",
      oldValue: undefined,
      newValue: ["test"],
    },
  ];
  applyObjDiffs(obj4, diffs4);
  expect(obj4).toEqual({
    a: 1,
    b: ["test"],
  });

  const obj5 = { a: 1 };
  const diffs5: Diff[] = [
    {
      path: ["a"],
      type: "removed",
      oldValue: 1,
      newValue: undefined,
    },
    {
      path: ["b"],
      type: "added",
      oldValue: undefined,
      newValue: ["test"],
    },
  ];
  applyObjDiffs(obj5, diffs5);
  expect(obj5).toEqual({
    b: ["test"],
  });

  const obj6 = { a: [{ b: "test" }] };
  const diffs6: Diff[] = [
    {
      path: ["a", 0, "b"],
      type: "changed",
      oldValue: "test",
      newValue: "test2",
    },
    {
      path: ["a", 1],
      type: "added",
      oldValue: undefined,
      newValue: {
        c: "test3",
      },
    },
  ];
  applyObjDiffs(obj6, diffs6);
  expect(obj6).toEqual({
    a: [{ b: "test2" }, { c: "test3" }],
  });

  const obj7 = [{ b: "test" }, { c: "test2" }];
  const diffs7: Diff[] = [
    {
      path: [0, "b"],
      type: "removed",
      oldValue: "test",
      newValue: undefined,
    },
    {
      path: [0, "c"],
      type: "added",
      oldValue: undefined,
      newValue: "test2",
    },
    {
      path: [1],
      type: "removed",
      oldValue: { c: "test2" },
      newValue: undefined,
    },
  ];
  applyObjDiffs(obj7, diffs7);
  expect(obj7).toEqual([{ c: "test2" }]);
});
