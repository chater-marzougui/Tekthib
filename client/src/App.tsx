import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "sonner";
import { SoundProvider } from "./context/SoundPlayerContext";

function App() {
  return (
    <Router basename="/Tekthib/">
      <Toaster
        richColors
        duration={5000}
        position="top-center"
        swipeDirections={["left", "right", "top"]}
        toastOptions={{ style: { fontSize: "1.1rem", width: "90%", maxWidth: "500px" } }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
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
    </Router>
  );
}

export default App;
