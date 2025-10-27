import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Room as BaseRoom, GameState } from "@/types";
import { Icon } from "@iconify/react";
import { useHeader } from "@/hooks/useHeader";
import DatabaseManagement from "@/components/admin/DatabaseManagement";
import SpectatorView from "@/components/admin/SpectatorView";

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
  const { t } = useTranslation();
  const [password, setPassword] = useState<string>(
    localStorage.getItem("adminPassword") || ""
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [spectatingRoom, setSpectatingRoom] = useState<string | null>(null);
  const { setHeaderConfig } = useHeader();

  const fetchSystemState = async (pwd: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/admin/system-state?password=${encodeURIComponent(pwd)}`
      );

      if (response.status === 401) {
        toast.error(t("admin.invalidPassword"));
        setIsAuthenticated(false);
        return;
      }

      localStorage.setItem("adminPassword", pwd);

      if (!response.ok) {
        throw new Error("Failed to fetch system state");
      }

      const data = await response.json();
      setSystemState(data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching system state:", error);
      toast.error(t("admin.failedToFetch"));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!password) {
      toast.error(t("admin.passwordRequired"));
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
        toast.error(t("admin.invalidPassword"));
        setIsAuthenticated(false);
        return;
      }

      if (response.status === 404) {
        toast.error(t("admin.roomNotFound"));
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      toast.success(t("admin.roomDeleted", { roomId }));
      // Refresh system state
      fetchSystemState(password);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t("admin.failedToDelete"));
    }
  };

  const deleteAllRooms = async () => {
    if (!password) {
      toast.error(t("admin.passwordRequired"));
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete ALL rooms? This action cannot be undone!"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/delete-all-rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.status === 401) {
        toast.error(t("admin.invalidPassword"));
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete all rooms");
      }

      const data = await response.json();
      toast.success(`${data.deletedCount} room(s) deleted successfully`);
      // Refresh system state
      fetchSystemState(password);
    } catch (error) {
      console.error("Error deleting all rooms:", error);
      toast.error("Failed to delete all rooms");
    }
  };

  const kickPlayer = async (
    roomId: string,
    playerId: string,
    playerName: string
  ) => {
    if (!password) {
      toast.error(t("admin.passwordRequired"));
      return;
    }

    if (!confirm(`Are you sure you want to kick player ${playerName}?`)) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/kick-player`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, playerId, password }),
      });

      if (response.status === 401) {
        toast.error(t("admin.invalidPassword"));
        setIsAuthenticated(false);
        return;
      }

      if (response.status === 404) {
        toast.error("Player or room not found");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to kick player");
      }

      toast.success(`Player ${playerName} kicked successfully`);
      // Refresh system state
      fetchSystemState(password);
    } catch (error) {
      console.error("Error kicking player:", error);
      toast.error("Failed to kick player");
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

  useEffect(() => {
    if (password.trim()) {
      handleLogin(new Event("submit") as unknown as React.FormEvent);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    setHeaderConfig({
      actionButton: {
        label: "Logout",
        onClick: () => {
          navigate("/");
        },
        variant: "destructive",
        color: "default",
      },
    });
    return () => {
      setHeaderConfig({
        actionButton: undefined,
      });
    };
  }, [t, isAuthenticated]);

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:lock" className="w-5 h-5" /> Admin Login
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
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Spectator View */}
        {spectatingRoom && (
          <div className="mb-6">
            <SpectatorView
              roomCode={spectatingRoom}
              onClose={() => setSpectatingRoom(null)}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground/80 flex items-center gap-2">
              <Icon icon="mdi:gamepad-variant" className="w-8 h-8" /> System
              Admin Dashboard
            </h1>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="system">System Monitor</TabsTrigger>
            <TabsTrigger value="database">Database Management</TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            {/* System Monitor Content (original content) */}
            <div className="space-y-6">
              {/* Auto-refresh controls */}
              <div className="flex gap-2 items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? "bg-green-100" : ""}
                >
                  {autoRefresh ? (
                    <>
                      <Icon icon="mdi:refresh" className="w-4 h-4 mr-2" />{" "}
                      Auto-refresh ON
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:pause" className="w-4 h-4 mr-2" />{" "}
                      Auto-refresh OFF
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
                      <Icon icon="mdi:refresh" className="w-4 h-4 mr-2" />{" "}
                      Refresh
                    </>
                  )}
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon icon="mdi:home" className="w-5 h-5" /> Total Active
                      Rooms
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
                      <Icon icon="mdi:account-group" className="w-5 h-5" />{" "}
                      Total Players Online
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-green-600">
                      {systemState?.totalPlayers || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Actions */}
              {systemState && systemState.totalRooms > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                      <Icon icon="mdi:alert" className="w-5 h-5" /> Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      onClick={deleteAllRooms}
                      className="w-fit p-5"
                    >
                      <Icon icon="mdi:delete-sweep" className="w-4 h-4 mr-2" />
                      Delete All Rooms ({systemState.totalRooms})
                    </Button>
                  </CardContent>
                </Card>
              )}

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
                        <Card key={room.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">
                                  Room Code: {room.code}
                                </CardTitle>
                                <CardDescription>
                                  Created:{" "}
                                  {new Date(room.createdAt).toLocaleString()}
                                </CardDescription>
                              </div>
                              <div className="text-right flex gap-2">
                                {room.gameState && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSpectatingRoom(room.code)}
                                    title="Watch Game"
                                  >
                                    <Icon
                                      icon="mdi:eye"
                                      className="w-4 h-4 mr-2"
                                    />
                                    Spectate
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-red-100 cursor-pointer"
                                  onClick={() => deleteRoom(room.id)}
                                  title="Delete Room"
                                >
                                  <Icon
                                    icon="mdi:delete"
                                    className="text-red-500 cursor-pointer"
                                  />
                                </Button>
                                <div className="text-sm font-medium">
                                  Players: {room.playerCount}/{room.maxPlayers}
                                </div>
                                {room.gameState && (
                                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                    <Icon
                                      icon="mdi:gamepad-variant"
                                      className="w-3 h-3"
                                    />{" "}
                                    Game in Progress
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Game State */}
                            {room.gameState && (
                              <div className="p-3 rounded border">
                                <h4 className="font-semibold mb-2">
                                  Game State
                                </h4>
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
                                      Player{" "}
                                      {room.gameState.currentPlayerIndex + 1}
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
                                    className="flex justify-between items-center p-2 rounded border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        #{idx + 1}
                                      </span>
                                      <span>{player.name}</span>
                                      {player.id === room.hostId && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                          HOST
                                        </span>
                                      )}
                                      {player.isBot && (
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                          BOT
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
                                        <Icon
                                          icon="mdi:circle"
                                          className={`w-2 h-2 fill-current ${
                                            player.isConnected
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        />
                                        {player.isConnected
                                          ? "Online"
                                          : "Offline"}
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
                                            <Icon
                                              icon="mdi:check"
                                              className="w-3 h-3"
                                            />{" "}
                                            Ready
                                          </>
                                        ) : (
                                          <>
                                            <Icon
                                              icon="mdi:clock-outline"
                                              className="w-3 h-3"
                                            />{" "}
                                            Not Ready
                                          </>
                                        )}
                                      </span>
                                      {room.gameState && (
                                        <span className="text-blue-600">
                                          🃏 {player.cardCount} cards
                                        </span>
                                      )}
                                      {!player.isBot && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 hover:bg-red-100 text-red-600"
                                          onClick={() =>
                                            kickPlayer(
                                              room.id,
                                              player.id,
                                              player.name
                                            )
                                          }
                                          title="Kick Player"
                                        >
                                          <Icon
                                            icon="mdi:account-remove"
                                            className="w-3 h-3"
                                          />
                                        </Button>
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
          </TabsContent>

          <TabsContent value="database">
            <DatabaseManagement baseUrl={baseUrl} password={password} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
