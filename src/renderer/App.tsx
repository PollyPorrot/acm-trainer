import { useState } from "react";
import { Layout, type AppPage } from "./components/Layout";
import { ImageWallPage } from "./pages/ImageWallPage";
import { TodayPage } from "./pages/TodayPage";
import { VpContestPage } from "./pages/VpContestPage";
import { VpReviewPage } from "./pages/VpReviewPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="placeholder-page" aria-labelledby="page-title">
      <p className="eyebrow">ACM Trainer</p>
      <h1 id="page-title">{title}</h1>
    </section>
  );
}

function renderPage(page: AppPage) {
  switch (page) {
    case "today":
      return <TodayPage />;
    case "contests":
      return <PlaceholderPage title="比赛提醒" />;
    case "vp":
      return <VpContestPage />;
    case "reviews":
      return <VpReviewPage />;
    case "images":
      return <ImageWallPage />;
    case "settings":
      return <PlaceholderPage title="设置" />;
  }
}

export function App() {
  const [activePage, setActivePage] = useState<AppPage>("today");

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage(activePage)}
    </Layout>
  );
}
