import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import type React from "react";

function WebSocketLayout({ children }: Readonly<React.PropsWithChildren>) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
          <Route element={<WebSocketLayout />}>
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
