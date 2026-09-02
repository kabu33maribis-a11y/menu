"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function openPicker(el: HTMLInputElement) {
  try {
    el.showPicker();
  } catch {
    el.focus();
  }
}

export function DateInput({ className = "", onClick, ...props }: Props) {
  return (
    <div className="date-input-wrap">
      <input
        {...props}
        type="date"
        className={`input ${className}`.trim()}
        onClick={(e) => {
          openPicker(e.currentTarget);
          onClick?.(e);
        }}
      />
    </div>
  );
}
