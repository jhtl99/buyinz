import { useState } from "react";
import { Home, Compass, MessageCircle, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "explore" | "messages" | "post" | "profile";

interface AppLayoutProps {
  children: (activeTab: Tab) => React.ReactNode;
}

const NAV_ITEMS = [
  { id: "home" as Tab, label: "Home", icon: Home },
  { id: "explore" as Tab, label: "Explore", icon: Compass },
  { id: "post" as Tab, label: "Post", icon: PlusCircle },
  { id: "messages" as Tab, label: "Messages", icon: MessageCircle },
  { id: "profile" as Tab, label: "Profile", icon: User },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-40">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <img src="/BLogoTeal.png" alt="Buyinz" className="w-8 h-8 rounded-lg flex-shrink-0 object-contain" />
          <div>
            <p className="font-bold text-sidebar-foreground text-sm leading-tight">Buyinz</p>
            <p className="text-xs text-muted-foreground leading-tight">Pittsburgh</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground text-center">Buyinz · Pittsburgh</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 md:ml-56 flex justify-center pb-20 md:pb-0">
        <div className="w-full max-w-[500px]">
          {children(activeTab)}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0",
                activeTab === id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  activeTab === id && "scale-110"
                )}
                strokeWidth={activeTab === id ? 2.5 : 1.8}
              />
              <span className="text-[9px] font-medium truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
