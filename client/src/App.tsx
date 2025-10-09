import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import { HeaderProvider } from "./context/HeaderContext";
import { Header } from "./components/Header";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import AdminPage from "./pages/AdminPage";
import KeywordTestPage from "./pages/KeywordTestPage";
import { Toaster } from "sonner";
import { SoundProvider } from "./context/SoundPlayerContext";
import { ThemeProvider } from "./context/ThemeProvider";
function App() {
  return (
    <Router basename="/Tekthib/">
      <ThemeProvider>
      <HeaderProvider>
        <Header />
        <Toaster
        richColors
        duration={3500}
        position="top-center"
        closeButton={true}
        swipeDirections={["left", "right", "top", "bottom"]}
        toastOptions={{
          style: { fontSize: "0.9rem" },
          classNames: {
            toast:
              "scale-90 md:scale-115 px-4 md:px-16 py-2 md:py-0 md:max-w-[500px]",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/keyword-test" element={<KeywordTestPage />} />
        <Route
          path="/*"
          element={
            <WebSocketProvider>
              <SoundProvider>
                <Routes>
                  <Route path="/room/:roomId" element={<RoomPage />} />
                  <Route path="/game/:roomId" element={<GamePage />} />
                </Routes>
              </SoundProvider>
            </WebSocketProvider>
          }
        />
      </Routes>
      </HeaderProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
