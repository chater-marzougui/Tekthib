import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <Toaster richColors duration={3000} position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/*"
          element={
            <WebSocketProvider>
              <Routes>
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/game/:roomId" element={<GamePage />} />
              </Routes>
            </WebSocketProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
