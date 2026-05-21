import {
  Bell,
  CalendarClock,
  ClipboardList,
  Home,
  Image,
  ListChecks,
  Settings
} from "lucide-react";
import type { ComponentType } from "react";

export type AppPage = "today" | "contests" | "vp" | "reviews" | "images" | "settings";

const navItems: Array<{ id: AppPage; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: "today", label: "今日", icon: Home },
  { id: "contests", label: "比赛提醒", icon: Bell },
  { id: "vp", label: "VP 比赛", icon: CalendarClock },
  { id: "reviews", label: "复盘", icon: ClipboardList },
  { id: "images", label: "图片墙", icon: Image },
  { id: "settings", label: "设置", icon: Settings }
];

export function Layout({
  activePage,
  children,
  onNavigate
}: {
  activePage: AppPage;
  children: React.ReactNode;
  onNavigate: (page: AppPage) => void;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ListChecks size={20} />
          <span>ACM Trainer</span>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="nav-item"
                data-active={activePage === item.id}
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <section className="content-area">{children}</section>
    </main>
  );
}
