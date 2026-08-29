/** Reverse-lookup: key whose value equals `value`. */
export function getKey(
  obj: Record<string, unknown>,
  value: unknown
): string | undefined {
  return Object.keys(obj).find((key) => obj[key] == value);
}

/** Reverse-lookup: key whose nested param equals `value`. */
export function getKeyByParam(
  obj: Record<string, Record<string, unknown>>,
  paramName: string,
  value: unknown
): string | undefined {
  return Object.keys(obj).find((key) => obj[key][paramName] == value);
}

/** First key whose nested param is >= value. */
export function getKeyByParamLess(
  obj: Record<string, Record<string, unknown>>,
  paramName: string,
  value: number
): string | undefined {
  return Object.keys(obj).find(
    (key) => Number(obj[key][paramName]) >= value
  );
}

export function closest(arr: Array<string | number>, goal: number): string {
  return String(
    arr.reduce((prev, curr) =>
      Math.abs(Number(curr) - goal) < Math.abs(Number(prev) - goal)
        ? curr
        : prev
    )
  );
}

export function plus(num: number): string {
  return (num >= 0 ? "+" : "") + num;
}

export function addVec(a: number[], b: number[]): number[] {
  return a.map((num, idx) => num + b[idx]);
}

export function round1(n: number): number {
  return Number(Math.round(Number(n + "e+1")) + "e-1");
}
