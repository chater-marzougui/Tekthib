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
          path="/room/:roomId"
          element={
            <WebSocketProvider>
              <RoomPage />
            </WebSocketProvider>
          }
        />
        <Route
          path="/game"
          element={
            <WebSocketProvider>
              <GamePage />
            </WebSocketProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
