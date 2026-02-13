import { motion } from 'framer-motion';
import { Settings, Package, Heart, Star, ChevronRight, LogOut } from 'lucide-react';

export function ProfileView() {
  const stats = [
    { label: 'Listings', value: 12 },
    { label: 'Sold', value: 8 },
    { label: 'Rating', value: '4.9' },
  ];

  const menuItems = [
    { icon: Package, label: 'My Listings', badge: '12' },
    { icon: Heart, label: 'Saved Items', badge: '5' },
    { icon: Star, label: 'Reviews' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-full overflow-y-auto pb-[var(--nav-padding)]">
      {/* Header */}
      <div className="px-[var(--space-sm)] py-[var(--space-md)]">
        <div className="flex items-center gap-[var(--space-sm)]">
          <div className="w-[var(--size-avatar)] h-[var(--size-avatar)] rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-[length:var(--text-heading)] font-bold text-primary-foreground">JD</span>
          </div>
          <div>
            <h1 className="text-[length:var(--text-price-sm)] font-bold text-foreground">@john_doe</h1>
            <p className="text-muted-foreground">Member since 2024</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-[var(--space-sm)] mt-[var(--space-md)]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex-1 bg-card rounded-2xl p-[var(--space-sm)] text-center">
              <p className="text-[length:var(--text-heading)] font-bold text-foreground">{stat.value}</p>
              <p className="text-[length:var(--text-body)] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-[var(--space-sm)] space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="w-full flex items-center gap-[var(--space-sm)] p-[var(--space-sm)] bg-card rounded-2xl hover:bg-card-elevated transition-colors"
          >
            <div className="w-[var(--size-action-sm)] h-[var(--size-action-sm)] rounded-xl bg-secondary flex items-center justify-center">
              <item.icon className="w-[var(--size-icon)] h-[var(--size-icon)] text-muted-foreground" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-1 bg-secondary rounded-full text-xs text-muted-foreground">
                {item.badge}
              </span>
            )}
            <ChevronRight className="w-[var(--size-icon)] h-[var(--size-icon)] text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Sign Out */}
      <div className="px-[var(--space-sm)] mt-[var(--space-lg)]">
        <button className="w-full flex items-center justify-center gap-2 p-[var(--space-sm)] text-destructive hover:bg-destructive/10 rounded-2xl transition-colors">
          <LogOut className="w-[var(--size-icon)] h-[var(--size-icon)]" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
