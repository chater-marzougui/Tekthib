import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
