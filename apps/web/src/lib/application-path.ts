const unsafeApplicationPathCharacter = /[\\\r\n\u0000]/;

export function isSafeApplicationPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !unsafeApplicationPathCharacter.test(value);
}
