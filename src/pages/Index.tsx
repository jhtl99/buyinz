import { AppLayout } from "@/components/AppLayout";
import { MessagesProvider } from "@/contexts/MessagesContext";
import { HomePage } from "@/pages/HomePage";
import { ExplorePage } from "@/pages/ExplorePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { PostPage } from "@/pages/PostPage";
import { ProfilePage } from "@/pages/ProfilePage";

const Index = () => {
  return (
    <MessagesProvider>
      <AppLayout>
        {(activeTab) => {
          if (activeTab === "home") return <HomePage />;
          if (activeTab === "explore") return <ExplorePage />;
          if (activeTab === "messages") return <MessagesPage />;
          if (activeTab === "post") return <PostPage />;
          if (activeTab === "profile") return <ProfilePage />;
          return null;
        }}
      </AppLayout>
    </MessagesProvider>
  );
};

export default Index;
