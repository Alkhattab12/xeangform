"use client";

export function SelectAll() {
  return (
    <button
      type="button"
      className="nb-btn nb-btn-ghost min-h-10 px-3 py-2 text-sm"
      onClick={() => {
        const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="ids"][form="bulk"]'));
        const allOn = boxes.length > 0 && boxes.every((b) => b.checked);
        boxes.forEach((b) => {
          b.checked = !allOn;
        });
      }}
    >
      Pilih / lepas semua
    </button>
  );
}
