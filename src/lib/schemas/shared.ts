export function isValidDate(val: string): boolean {
  return !isNaN(new Date(val).getTime())
}