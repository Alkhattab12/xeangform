/**
 * Elemen dekoratif yang melayang di belakang konten saat tema berada di mode dinamis.
 * Murni markup + CSS (lihat `.xf-dyn-*` di globals.css): aria-hidden, tidak menerima klik, hanya transform/opacity.
 * Bentuknya menyesuaikan dekorasi tema lewat atribut `data-decor` pada pembungkus.
 */
export function DynamicDecor() {
  return (
    <div className="xf-dyn-shapes" aria-hidden="true">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <span key={n} className={`xf-dyn-shape xf-dyn-shape-${n}`} />
      ))}
    </div>
  );
}
