import { useState } from "react";
import { Layout, type AppPage } from "./components/Layout";
import { ContestReminderPage } from "./pages/ContestReminderPage";
import { ImageWallPage } from "./pages/ImageWallPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimerPage } from "./pages/TimerPage";
import { TodayPage } from "./pages/TodayPage";
import { VpContestPage } from "./pages/VpContestPage";
import { VpReviewPage } from "./pages/VpReviewPage";

function renderPage(page: AppPage) {
  switch (page) {
    case "today":
      return <TodayPage />;
    case "contests":
      return <ContestReminderPage />;
    case "vp":
      return <VpContestPage />;
    case "reviews":
      return <VpReviewPage />;
    case "images":
      return <ImageWallPage />;
    case "settings":
      return <SettingsPage />;
  }
}

export function App() {
  const route = window.location.hash;
  const isReminderRoute = route === "#/reminder";
  const isTimerRoute = route === "#/timer";
  const [activePage, setActivePage] = useState<AppPage>("today");

  if (isReminderRoute) {
    return (
      <TodayPage
        compactReminder
        initialReminderOpen
        onReminderClose={() => {
          window.close();
        }}
      />
    );
  }

  if (isTimerRoute) {
    return <TimerPage />;
  }

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage(activePage)}
    </Layout>
  );
}
