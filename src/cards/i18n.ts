export function stringFormat(text: unknown): string {
  let str = text?.toString() || "";
  str = str.replace(/_/g, " ").replace("nn", "ñ");
  return str;
}

export function numberFormat(x: string | number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function toCap(string: string): string {
  if (string === "") return string;
  return string[0].toUpperCase() + string.substring(1);
}
