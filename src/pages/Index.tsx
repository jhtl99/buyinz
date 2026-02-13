import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { FeedView } from '@/components/FeedView';
import { SearchView } from '@/components/SearchView';
import { PostView } from '@/components/PostView';
import { ChatsView } from '@/components/ChatsView';
import { ProfileView } from '@/components/ProfileView';

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [showPostFlow, setShowPostFlow] = useState(false);

  const handleTabChange = (tab: string) => {
    if (tab === 'post') {
      setShowPostFlow(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden pb-[var(--nav-padding)]">
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && !showPostFlow && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <FeedView />
            </motion.div>
          )}
          
          {activeTab === 'search' && !showPostFlow && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <SearchView />
            </motion.div>
          )}
          
          {activeTab === 'chats' && !showPostFlow && (
            <motion.div
              key="chats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ChatsView />
            </motion.div>
          )}
          
          {activeTab === 'profile' && !showPostFlow && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ProfileView />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Flow Modal */}
        <AnimatePresence>
          {showPostFlow && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-40 bg-background"
            >
              <PostView onComplete={() => setShowPostFlow(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {!showPostFlow && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
};

export default Index;
