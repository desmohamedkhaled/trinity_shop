export function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="mx-auto mb-9 max-w-2xl text-center md:mb-10">
    <p className="mb-3 text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">{eyebrow}</p>
    <h2 className="display-font text-4xl leading-tight md:text-6xl">{title}</h2>
    {text && <p className="mt-4 text-base leading-7 text-black/60">{text}</p>}
  </div>;
}
