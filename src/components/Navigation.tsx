"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/records", label: "記録一覧", icon: "📋" },
  { href: "/stats", label: "統計", icon: "📊" },
  { href: "/suggest", label: "献立を決める", icon: "✨" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 hidden flex-wrap gap-2 md:flex" aria-label="デスクトップメニュー">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${active ? "nav-link-on" : ""}`}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
