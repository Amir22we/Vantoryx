import { useState, useEffect } from "react";
import "./app.css";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./app/layout";
import { HomePage } from "./app/pages/home";
import { StatusPage } from "./app/pages/status";
import { TextPage } from "./app/pages/text";
import { LinksPage } from "./app/pages/links";
import { WhatToReplyPage } from "./app/pages/whatToReply";
import { RewritePage } from "./app/pages/rewrite";
import { ReversePage } from "./app/pages/reverse";
import { AudioPage } from "./app/pages/audio";
import { HelpPage } from "./app/pages/help";
import { AboutPage } from "./app/pages/about";
import { HistoryPage } from "./app/pages/history";
import { AnalyticsPage } from "./app/pages/analytics";
import { SettingsPage } from "./app/pages/settings";
import { ThemeContext, type Theme } from "./lib/theme";
import { SplashScreen } from "./ui/components";

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) ?? "light";
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/text" element={<TextPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/what-to-reply" element={<WhatToReplyPage />} />
          <Route path="/rewrite" element={<RewritePage />} />
          <Route path="/reverse" element={<ReversePage />} />
          <Route path="/audio" element={<AudioPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeContext.Provider>
  );
}
