declare module "number-to-base64" {
  const numberToBase64: {
    ntob: (n: number) => string;
    bton: (s: string) => number;
  };
  export default numberToBase64;
}
