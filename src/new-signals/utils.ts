export function isCanBeSignal(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}
