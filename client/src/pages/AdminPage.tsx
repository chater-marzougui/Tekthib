import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Room as BaseRoom, GameState } from "@/types";
import { Trash, Lock, Gamepad2, Home, Users, RotateCw, Pause, Circle, Check, Clock } from "lucide-react";

interface Room extends BaseRoom {
  gameState: GameState | null;
  playerCount: number;
  createdAt: string;
}

interface SystemState {
  totalRooms: number;
  totalPlayers: number;
  rooms: Room[];
}

const baseUrl =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

export default function AdminPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemState = async (pwd: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/admin/system-state?password=${encodeURIComponent(pwd)}`
      );

      if (response.status === 401) {
        toast.error("Invalid admin password");
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch system state");
      }

      const data = await response.json();
      setSystemState(data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching system state:", error);
      toast.error("Failed to fetch system state");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!password) {
      toast.error("Admin password is required");
      return;
    }

    if (!confirm(`Are you sure you want to delete room ${roomId}?`)) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/delete-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, password }),
      });

      if (response.status === 401) {
        toast.error("Invalid admin password");
        setIsAuthenticated(false);
        return;
      }

      if (response.status === 404) {
        toast.error("Room not found");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      toast.success(`Room ${roomId} deleted`);
      // Refresh system state
      fetchSystemState(password);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      fetchSystemState(password);
    }
  };

  // Auto-refresh every 5 seconds when authenticated
  useEffect(() => {
    if (isAuthenticated && autoRefresh && password) {
      const interval = setInterval(() => {
        fetchSystemState(password);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, autoRefresh, password]);

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Admin Login
            </CardTitle>
            <CardDescription>
              Enter admin password to view system state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Checking..." : "Login"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Back
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Gamepad2 className="w-8 h-8" /> System Admin Dashboard
            </h1>
            <p className="text-gray-600">Real-time system state monitoring</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-100" : ""}
            >
              {autoRefresh ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2" /> Auto-refresh ON
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Auto-refresh OFF
                </>
              )}
            </Button>
            <Button
              onClick={() => fetchSystemState(password)}
              disabled={isLoading}
            >
              {isLoading ? (
                "Refreshing..."
              ) : (
                <>
                  <RotateCw className="w-4 h-4 mr-2" /> Refresh
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAuthenticated(false);
                setPassword("");
                navigate("/");
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" /> Total Active Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-600">
                {systemState?.totalRooms || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Total Players Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600">
                {systemState?.totalPlayers || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Rooms</CardTitle>
            <CardDescription>
              {systemState?.rooms.length === 0
                ? "No active rooms"
                : `${systemState?.rooms.length} room(s) active`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemState?.rooms.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No rooms currently active
              </p>
            ) : (
              <div className="space-y-4">
                {systemState?.rooms.map((room) => (
                  <Card key={room.id} className="bg-gray-50">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Room Code: {room.code}
                          </CardTitle>
                          <CardDescription>
                            Created: {new Date(room.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-red-100 cursor-pointer"
                            onClick={() => deleteRoom(room.id)}
                            title="Delete Room"
                          >
                            <Trash className="text-red-500 cursor-pointer" />
                          </Button>
                          <div className="text-sm font-medium">
                            Players: {room.playerCount}/{room.maxPlayers}
                          </div>
                          {room.gameState && (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <Gamepad2 className="w-3 h-3" /> Game in Progress
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Game State */}
                      {room.gameState && (
                        <div className="bg-white p-3 rounded border">
                          <h4 className="font-semibold mb-2">Game State</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              Phase:{" "}
                              <span className="font-medium">
                                {room.gameState.phase}
                              </span>
                            </div>
                            <div>
                              Current Player:{" "}
                              <span className="font-medium">
                                Player {room.gameState.currentPlayerIndex + 1}
                              </span>
                            </div>
                            <div>
                              Pile Count:{" "}
                              <span className="font-medium">
                                {room.gameState.pileCount}
                              </span>
                            </div>
                            <div>
                              Current Rank:{" "}
                              <span className="font-medium">
                                {room.gameState.currentRank || "None"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Players List */}
                      <div>
                        <h4 className="font-semibold mb-2">Players</h4>
                        <div className="space-y-2">
                          {room.players.map((player, idx) => (
                            <div
                              key={player.id}
                              className="flex justify-between items-center bg-white p-2 rounded border"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">#{idx + 1}</span>
                                <span>{player.name}</span>
                                {player.id === room.hostId && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                    HOST
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={
                                    player.isConnected
                                      ? "text-green-600 flex items-center gap-1"
                                      : "text-red-600 flex items-center gap-1"
                                  }
                                >
                                  <Circle
                                    className={`w-2 h-2 fill-current ${
                                      player.isConnected
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  />
                                  {player.isConnected ? "Online" : "Offline"}
                                </span>
                                <span
                                  className={
                                    player.isReady
                                      ? "text-green-600 flex items-center gap-1"
                                      : "text-gray-500 flex items-center gap-1"
                                  }
                                >
                                  {player.isReady ? (
                                    <>
                                      <Check className="w-3 h-3" /> Ready
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" /> Not Ready
                                    </>
                                  )}
                                </span>
                                {room.gameState && (
                                  <span className="text-blue-600">
                                    🃏 {player.cardCount} cards
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
