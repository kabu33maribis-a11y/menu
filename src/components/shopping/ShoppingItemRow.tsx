"use client";

type Props = {
  name: string;
  checked: boolean;
  purchased?: boolean;
  temporary?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  mode?: "select" | "shop";
};

export function ShoppingItemRow({
  name,
  checked,
  purchased = false,
  temporary = false,
  onToggle,
  disabled = false,
  mode = "select",
}: Props) {
  const isShop = mode === "shop";
  const done = isShop && purchased;

  return (
    <li>
      <button
        type="button"
        className={`shopping-row ${done ? "shopping-row-done" : ""} ${
          !isShop && checked ? "shopping-row-selected" : ""
        }`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isShop ? purchased : checked}
      >
        <span className={`shopping-check ${done || (!isShop && checked) ? "shopping-check-on" : ""}`}>
          {done || (!isShop && checked) ? "✓" : ""}
        </span>
        <span className="shopping-row-label">
          {name}
          {temporary ? <span className="shopping-temp-badge">今回だけ</span> : null}
        </span>
      </button>
    </li>
  );
}
