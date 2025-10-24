import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import { HeaderProvider } from "./context/HeaderContext";
import { Header } from "./components/Header";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "sonner";
import { SoundProvider } from "./context/SoundPlayerContext";
import { ThemeProvider } from "./context/ThemeProvider";
import { WebRTCWrapper } from "./components/WebRTCWrapper";
import { initializeCardImages } from "./components/game/RenderCard";

function App() {
  // Preload card images once when the app initializes
  initializeCardImages();
  return (
    <Router basename="/Tekthib/">
      <ThemeProvider>
        <SoundProvider>
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
              <Route
                path="/*"
                element={
                  <WebSocketProvider>
                    <WebRTCWrapper>
                      <Routes>
                        <Route path="/room/:roomId" element={<RoomPage />} />
                        <Route path="/game/:roomId" element={<GamePage />} />
                        <Route path="*" element={<HomePage />} />
                      </Routes>
                    </WebRTCWrapper>
                  </WebSocketProvider>
                }
              />
            </Routes>
          </HeaderProvider>
        </SoundProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
