"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/records", label: "履歴", icon: "📋" },
  { href: "/shopping", label: "買い物", icon: "🛒" },
];

/** 「その他」メニューにまとめる画面 */
const moreLinks = [
  { href: "/stats", label: "統計", icon: "📊" },
  { href: "/suggest", label: "献立を決める", icon: "✨" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreLinks.some((link) => isActive(pathname, link.href));

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          className="mobile-more-backdrop md:hidden"
          aria-label="メニューを閉じる"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <nav className="mobile-bottom-nav md:hidden" aria-label="メインメニュー">
        {moreOpen && (
          <div id="mobile-more-menu" className="mobile-more-menu">
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-more-item ${isActive(pathname, link.href) ? "mobile-more-item-active" : ""}`}
                onClick={() => setMoreOpen(false)}
              >
                <span className="mobile-more-icon" aria-hidden="true">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </div>
        )}
        <div className="mobile-bottom-nav-inner">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-nav-item ${isActive(pathname, link.href) ? "mobile-nav-item-active" : ""}`}
              aria-label={link.label}
              onClick={() => setMoreOpen(false)}
            >
              <span className="mobile-nav-icon" aria-hidden="true">
                {link.icon}
              </span>
            </Link>
          ))}
          <button
            type="button"
            className={`mobile-nav-item ${moreActive || moreOpen ? "mobile-nav-item-active" : ""}`}
            aria-label="その他"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              ⋯
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
