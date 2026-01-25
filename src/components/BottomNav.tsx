import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'post', icon: Plus, label: 'Post' },
  { id: 'chats', icon: MessageCircle, label: 'Chats' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-nav-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isPost = tab.id === 'post';
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-colors ${
                isPost 
                  ? 'bg-primary text-primary-foreground shadow-glow' 
                  : ''
              }`}
            >
              {isActive && !isPost && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-secondary rounded-2xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon 
                className={`relative z-10 w-6 h-6 ${
                  isPost 
                    ? '' 
                    : isActive 
                      ? 'text-nav-active' 
                      : 'text-nav-inactive'
                }`} 
                strokeWidth={isActive || isPost ? 2.5 : 2}
              />
              {!isPost && (
                <span 
                  className={`relative z-10 text-[10px] mt-0.5 font-medium ${
                    isActive ? 'text-nav-active' : 'text-nav-inactive'
                  }`}
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
