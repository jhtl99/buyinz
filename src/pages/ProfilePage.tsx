import { useState } from "react";
import { Settings, MapPin, Grid3X3, Sun, Moon, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { CURRENT_USER, MY_LISTINGS } from "@/data/mockData";
import { Switch } from "@/components/ui/switch";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-bold text-foreground text-base">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      {/* Slide-over */}
      <div className="w-80 bg-card border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
          {/* Appearance */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Appearance
            </h3>
            <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {theme === "dark" ? "Easy on the eyes" : "Bright & clean"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          </section>

          {/* Account */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Account
            </h3>
            <div className="bg-muted rounded-xl overflow-hidden divide-y divide-border">
              {[
                { label: "Display Name", value: CURRENT_USER.displayName },
                { label: "Username", value: `@${CURRENT_USER.username}` },
                { label: "Bio", value: CURRENT_USER.bio },
                { label: "Location / Zipcode", value: "Pittsburgh, PA 15289" },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{value}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </section>

          {/* Avatar Placeholder */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Profile Photo
            </h3>
            <div className="bg-muted rounded-xl p-4 flex items-center gap-4">
              <img
                src={CURRENT_USER.avatar}
                alt="Avatar"
                className="w-14 h-14 rounded-full border-2 border-primary/30"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Change Photo</p>
                <p className="text-xs text-muted-foreground">Update your profile picture</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Glassmorphism Header */}
      <header className="sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-foreground text-base">@{CURRENT_USER.username}</span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* Profile Header */}
      <div className="px-4 py-5">
        {/* Avatar + Stats */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src={CURRENT_USER.avatar}
            alt={CURRENT_USER.displayName}
            className="w-20 h-20 rounded-full border-2 border-primary/40 bg-muted flex-shrink-0"
          />
          <div className="flex flex-1 items-center justify-around">
            <StatPill label="Posts" value={CURRENT_USER.posts} />
            <div className="w-px h-8 bg-border" />
            <StatPill label="Followers" value={CURRENT_USER.followers} />
            <div className="w-px h-8 bg-border" />
            <StatPill label="Following" value={CURRENT_USER.following} />
          </div>
        </div>

        {/* Name + Bio */}
        <div className="mb-4">
          <p className="font-bold text-foreground text-base">{CURRENT_USER.displayName}</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{CURRENT_USER.bio}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">{CURRENT_USER.location}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 bg-muted hover:bg-muted/70 text-foreground font-semibold text-sm py-2 rounded-lg transition-colors">
            Edit Profile
          </button>
          <button className="flex-1 bg-muted hover:bg-muted/70 text-foreground font-semibold text-sm py-2 rounded-lg transition-colors">
            Share
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 bg-muted hover:bg-muted/70 text-foreground py-2 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Divider + Grid Header */}
      <div className="flex items-center border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-foreground">
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm font-semibold">Listings</span>
        </div>
      </div>

      {/* Instagram-style 3-col Grid */}
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {MY_LISTINGS.map((listing) => (
          <div key={listing.id} className="relative aspect-square overflow-hidden group cursor-pointer">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Price on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 p-2">
              <span className="brand-gradient text-white text-sm font-bold px-2.5 py-1 rounded-full">
                ${listing.price}
              </span>
              <p className="text-white text-xs text-center line-clamp-2 font-medium leading-tight">
                {listing.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Panel */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
