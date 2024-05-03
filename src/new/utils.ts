export function joinPath(path: (string | symbol)[]): string {
  if (!path.length) return "";

  let joinedPath = path[0].toString();

  for (let i = 1; i < path.length; i++) {
    joinedPath += `.${path[i].toString()}`;
  }

  return joinedPath;
}
