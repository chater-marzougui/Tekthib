import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "sonner";
function App() {
    return (_jsxs(Router, { children: [_jsx(Toaster, { richColors: true, duration: 3000, position: "top-right" }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) }), _jsx(Route, { path: "/*", element: _jsx(WebSocketProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/room/:roomId", element: _jsx(RoomPage, {}) }), _jsx(Route, { path: "/game/:roomId", element: _jsx(GamePage, {}) })] }) }) })] })] }));
}
export default App;
