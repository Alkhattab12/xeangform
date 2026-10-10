/** Bentuk dekoratif murni — disembunyikan dari screen reader. */
const STAR_POINTS = Array.from({ length: 24 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
  const r = i % 2 ? 34 : 50;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

export function Starburst({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className} strokeWidth={3} strokeLinejoin="miter">
      <polygon points={STAR_POINTS} />
    </svg>
  );
}
