/** A person across spellings: the lower-cased text before the `@` (REQ-BEADS-023); the same rule as the backend's `person_key`. */
export function personOf(value: string | null | undefined): string | null {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "") return null;
  return text.split("@", 1)[0] || text;
}

export function samePerson(a: string | null | undefined, b: string | null | undefined): boolean {
  const person = personOf(a);
  return person !== null && person === personOf(b);
}
