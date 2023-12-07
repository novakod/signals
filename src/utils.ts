import { isPureObject } from "@novakod/is-pure-object";

export type DiffType = "added" | "removed" | "changed";

export type Diff = {
  path: (string | symbol | number)[];
  type: DiffType;
  oldValue: unknown;
  newValue: unknown;
};

export function findObjDiffs(obj1: object, obj2: object): Diff[] {
  return _findObjDiffs(obj1, obj2);
}

function _findObjDiffs(obj1: object, obj2: object, path: Diff["path"] = [], obj1HasField = false, obj2HasField = false): Diff[] {
  const diffs: Diff[] = [];

  if (
    path.length === 0 &&
    ((Array.isArray(obj1) && !Array.isArray(obj2)) ||
      (!Array.isArray(obj1) && Array.isArray(obj2)) ||
      (isPureObject(obj1) && !isPureObject(obj2)) ||
      (!isPureObject(obj1) && isPureObject(obj2)))
  )
    return diffs;

  let type: DiffType = "changed";

  if (obj1HasField && !obj2HasField) type = "removed";
  else if (!obj1HasField && obj2HasField) type = "added";

  if (isPureObject(obj1)) {
    if (!isPureObject(obj2)) {
      diffs.push({ path, oldValue: obj1, newValue: obj2, type });
    } else {
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

      allKeys.forEach((key) => {
        diffs.push(..._findObjDiffs(obj1[key], obj2[key], [...path, key], Object.hasOwn(obj1, key), Object.hasOwn(obj2, key)));
      });
    }
  } else if (Array.isArray(obj1)) {
    if (!Array.isArray(obj2)) {
      diffs.push({ path, oldValue: obj1, newValue: obj2, type });
    } else {
      const maxLength = Math.max(obj1.length, obj2.length);

      for (let i = 0; i < maxLength; i++) {
        diffs.push(..._findObjDiffs(obj1[i], obj2[i], [...path, i], i < obj1.length, i < obj2.length));
      }
    }
  } else if (obj1 !== obj2) {
    diffs.push({ path, oldValue: obj1, newValue: obj2, type });
  }

  return diffs;
}

export function applyObjDiffs(obj: object, diffs: Diff[]): void {
  diffs.forEach((diff) => {
    const pathWithoutLastKey = diff.path.slice(0, -1);
    const lastKey = diff.path[diff.path.length - 1];
    const lastObj = pathWithoutLastKey.reduce((obj, key) => obj[key as keyof typeof obj], obj);

    switch (diff.type) {
      case "changed":
        lastObj[lastKey as keyof typeof lastObj] = diff.newValue as never;
        break;
      case "added":
        lastObj[lastKey as keyof typeof lastObj] = diff.newValue as never;
        break;
      case "removed":
        if (Array.isArray(lastObj)) {
          lastObj.splice(lastKey as number, 1);
        } else delete lastObj[lastKey as keyof typeof lastObj];
        break;
    }
  });
}
