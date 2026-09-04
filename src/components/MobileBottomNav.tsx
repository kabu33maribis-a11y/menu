"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/records", label: "履歴", icon: "📋" },
  { href: "/stats", label: "統計", icon: "📊" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="メインメニュー">
      <div className="mobile-bottom-nav-inner">
        {mainLinks.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-nav-item ${active ? "mobile-nav-item-active" : ""}`}
            >
              <span className="mobile-nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="mobile-nav-label">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
