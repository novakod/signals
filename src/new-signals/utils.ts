export function isCanBeSignal(value: object) {
  return typeof value === "object" && value !== null;
}
