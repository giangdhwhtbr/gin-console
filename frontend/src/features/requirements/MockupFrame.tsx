/** REQ-REQUIREMENTS-011: the only place a mockup is shown. No allow-same-origin: its scripts must not reach the console. */
export function MockupFrame({ title, src }: { title: string; src: string }) {
  return <iframe title={title} src={src} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-[70vh] w-full rounded border bg-white" />;
}
