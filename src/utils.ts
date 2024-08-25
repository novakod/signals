export function joinPath(path: (string | symbol)[]): string {
  if (!path.length) return "";

  let joinedPath = path[0].toString();

  for (let i = 1; i < path.length; i++) {
    joinedPath += `.${path[i].toString()}`;
  }

  return joinedPath;
}

export function deepGet<Data>(obj: Record<string, any>, path: (string | symbol)[]): Data {
  let result: Data = obj as Data;

  for (let i = 0; i < path.length; i++) {
    const part = path[i];
    if (typeof result !== "object" || result === null || !Object.hasOwn(result as object, part)) return undefined as Data;

    result = result![part as keyof typeof result] as Data;
  }

  return result;
}

/**
 * indexOf намного быстрее чем startsWith, поэтому написана эта функция
 */
export function startsWith(str: string, prefix: string): boolean {
  return str.indexOf(prefix) === 0;
}
