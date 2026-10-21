export function TextSection({ title, text }: { title: string; text: string | null }) {
  if (text === null) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-medium">{title}</h2>
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </section>
  );
}
