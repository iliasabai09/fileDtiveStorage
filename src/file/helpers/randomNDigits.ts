export function randomNDigits(digits = 3): number {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return Math.floor(Math.random() * (max - min) + min);
}
