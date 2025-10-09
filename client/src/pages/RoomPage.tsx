import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocketContext } from "@/context/WebSocketContext";
import ChatBox from "@/components/chat/ChatBox";
import type { Player } from "shared";
import { toast } from "sonner";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import VoiceChat from "@/components/chat/VoiceChat";
import { Trash, Gamepad2, Bot, Check, Rocket } from "lucide-react";
import { PlayerBadge } from "@/components/PlayerBadge";
import { QRCodeCard } from "@/components/QRCodeDialog";
import { Switch } from "@/components/ui/switch";
import { useHeader } from "@/context/HeaderContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function isDuplicatePlayer(players: Player[], newPlayer: Player): boolean {
  return players.some((p) => p.id === newPlayer.id);
}

export default function RoomPage() {
  const { t } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { setHeaderConfig } = useHeader();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [timerSlideEnabled, setTimerSlideEnabled] = useState(true);
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(45);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const playerName = localStorage.getItem("playerName") || "";
  const playerId = localStorage.getItem("clientId") || "";
  const roomCodeRef = useRef(roomCode);

  // Get isPublic from URL params if creating room
  const searchParams = new URLSearchParams(window.location.search);
  const isPublic = searchParams.get("isPublic") !== "false";

  // Check if player name is set on mount
  useEffect(() => {
    if (!playerName || playerName === "Unknown") {
      setShowNameDialog(true);
    }
  }, [playerName]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    // Register WebSocket message handlers
    const unregisterRoomCreated = registerHandler("room-created", (message) => {
      if (message.type === "ROOM_CREATED") {
        const { room } = message.payload;
        setRoomCode(room.code);
        setIsHost(true);
        setPlayers(room.players);
        setAutoPlayTimeout(room.autoPlayTimeout ?? 45);
        setTimerSlideEnabled(room.autoPlayTimeout && room.autoPlayTimeout > 0);
        setIsReady(
          room.players.find((p: Player) => p.id === playerId)?.isReady || false
        );
        // Update URL to reflect actual room code
        const basePath = window.location.pathname.split("/room")[0];
        window.history.replaceState(null, "", `${basePath}/room/${room.code}`);
      }
    });

    const unregisterRoomJoined = registerHandler("room-joined", (message) => {
      if (message.type === "ROOM_JOINED") {
        const { room } = message.payload;
        setRoomCode(room.code);
        setPlayers(room.players);
        setAutoPlayTimeout(room.autoPlayTimeout ?? 45);
        setIsReady(
          room.players.find((p: Player) => p.id === playerId)?.isReady ||
            isReady
        );
        setIsHost(room.hostId === playerId);
      }
    });

    const unregisterPlayerJoined = registerHandler(
      "player-joined",
      (message) => {
        if (message.type === "PLAYER_JOINED") {
          const { player } = message.payload;
          setPlayers((prev) => {
            if (!isDuplicatePlayer(prev, player)) {
              return [...prev, player];
            }
            return prev;
          });
        }
      }
    );

    const unregisterPlayerLeft = registerHandler("player-left", (message) => {
      if (message.type === "PLAYER_LEFT") {
        const { playerId: leftPlayerId, newHostId } = message.payload;
        setPlayers((prev) => prev.filter((p) => p.id !== leftPlayerId));
        if (newHostId && newHostId === playerId) {
          setIsHost(true);
        }
      }
    });

    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const { playerId: updatedPlayerId, isReady: updatedReady } =
            message.payload;
          setIsReady((prev) =>
            updatedPlayerId === playerId ? updatedReady : prev
          );
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === updatedPlayerId ? { ...p, isReady: updatedReady } : p
            )
          );
        }
      }
    );

    const unregisterGameStarted = registerHandler("game-started", (message) => {
      if (message.type === "GAME_STARTED") {
        const currentRoomCode = roomCodeRef.current || roomId;
        navigate(`/game/${currentRoomCode}`);
      }
    });

    const unregisterError = registerHandler("error", (message) => {
      if (message.type === "ERROR") {
        setError(message.payload.message);
        toast.error(`Error: ${message.payload.message}`);
      }
      if (message.payload.code === "ROOM_NOT_FOUND") {
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    });

    const unregisterBotsAdded = registerHandler("bots-added", (message) => {
      if (message.type === "BOTS_ADDED") {
        const { players: updatedPlayers } = message.payload;
        setPlayers(updatedPlayers);
        toast.success("Bots added successfully!");
      }
    });

    const unregisterBotRemoved = registerHandler("bot-removed", (message) => {
      if (message.type === "BOT_REMOVED") {
        const { players: updatedPlayers } = message.payload;
        setPlayers(updatedPlayers);
        toast.success("Bot removed successfully!");
      }
    });

    const unregisterGameReset = registerHandler("game-reset", (message) => {
      if (message.type === "GAME_RESET") {
        const { room } = message.payload;
        setRoomCode(room.code);
        setPlayers(room.players);
        setIsHost(room.hostId === playerId);
        setIsReady(false);
        toast.success("Game has been reset! Get ready to play again.");
      }
    });

    // Create or join room based on roomId parameter
    if (roomId === "create") {
      sendMessage({
        type: "CREATE_ROOM",
        payload: {
          playerName,
          maxPlayers: 10,
          isPublic,
          autoPlayTimeout,
        },
      });
    } else if (roomId !== "create") {
      sendMessage({
        type: "JOIN_ROOM",
        payload: { roomCode: roomId || "", playerName },
      });
    }

    return () => {
      unregisterRoomCreated();
      unregisterRoomJoined();
      unregisterPlayerJoined();
      unregisterPlayerLeft();
      unregisterGameStateUpdate();
      unregisterGameStarted();
      unregisterError();
      unregisterBotsAdded();
      unregisterBotRemoved();
      unregisterGameReset();
    };
  }, [
    roomId,
    isConnected,
    sendMessage,
    registerHandler,
    navigate,
    playerId,
    playerName,
    isPublic,
  ]);

  useEffect(() => {
    setHeaderConfig({
      actionButton: {
        label: t('room.leaveRoom'),
        onClick: () => setShowLeaveDialog(true),
        variant: "destructive",
        color: "default",
      },
    });

    return () => {
      setHeaderConfig({
        actionButton: undefined,
      });
    };
  }, [t]);

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    sendMessage({
      type: "READY",
      payload: { ready: newReadyState },
    });
  };

  const handleStartGame = () => {
    if (isHost && canStartGame) {
      sendMessage({
        type: "START_GAME",
        payload: { autoPlayTimeout },
      });
    }
  };

  const handleLeaveRoom = () => {
    sendMessage({
      type: "LEAVE_ROOM",
      payload: { roomId: roomCode, playerId },
    });
    navigate("/");
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      localStorage.setItem("playerName", nameInput.trim());
      setShowNameDialog(false);
      // Reload the page to use the new name
      window.location.reload();
    } else {
      toast.error("Please enter a valid name");
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Room code copied to clipboard!");
  };

  const handleAddBots = (count: number) => {
    if (isHost) {
      sendMessage({
        type: "ADD_BOTS",
        payload: { count },
      });
    }
  };

  const handleRemovePlayer = (Id: string, isBot: boolean) => {
    if (isHost) {
      sendMessage({
        type: isBot ? "REMOVE_BOT" : "KICK_PLAYER",
        payload: isBot ? { botId: Id } : { playerId: Id },
      });
    }
  };

  const canStartGame =
    isHost && players.length >= 3 && players.every((p) => p.isReady || p.isBot);

  // Wrap content with VoiceChatProvider if we have a room
  const content = (
    <div className="min-h-screen p-4">
      {/* Confirm leave dialog */}
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleLeaveRoom}
        title={t('confirmDialog.leaveRoomTitle')}
        description={t('confirmDialog.leaveRoomDescription')}
        confirmText={t('confirmDialog.leave')}
        cancelText={t('confirmDialog.cancel')}
        variant="destructive"
      />

      {/* Name prompt dialog */}
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Enter Your Name</DialogTitle>
            <DialogDescription>
              Please enter your name to join the room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name</Label>
              <Input
                id="player-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNameSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Gamepad2 className="w-8 h-8" /> Game Lobby
          </h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          {!isConnected && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
              Connecting to server...
            </div>
          )}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Room Code:</span>
              <Button
                variant="outline"
                onClick={copyRoomCode}
                className="font-mono text-lg px-4 cursor-pointer"
                disabled={!roomCode}
              >
                {roomCode || "Loading..."}
              </Button>
              {roomCode && <QRCodeCard roomCode={roomCode} />}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Players ({players.length}/10)</CardTitle>
                <CardDescription>
                  Waiting for players to join and get ready...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <PlayerBadge player={player} playerId={player.id} />
                        <div>
                          <div className="font-medium">
                            {player.name}
                            {player.id === playerId && " (You)"}
                            {player.isBot && (
                              <Bot className="w-4 h-4 inline-block ml-1" />
                            )}
                          </div>
                          {player.id === players[0]?.id && (
                            <div className="text-xs text-gray-500">{t('room.youAreHost')}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {isHost && player.id !== playerId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 cursor-pointer"
                            onClick={() =>
                              handleRemovePlayer(
                                player.id,
                                player.isBot || false
                              )
                            }
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={handleReadyToggle}
                          disabled={player.id !== playerId}
                        >
                          {player.isReady || player.isBot ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                              {t('room.ready')} <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              {t('room.notReady')}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 6 - players.length) }).map(
                    (_, index) => (
                      <div
                        key={`empty-${index + 1}-slot`}
                        className="flex items-center p-3 bg-card rounded-lg border-2 border-dashed border-gray-300"
                      >
                        <div className="text-gray-400">
                          {t('room.waiting')}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat Box */}
            {playerId && playerName && (
              <ChatBox playerName={playerName} playerId={playerId} />
            )}
          </div>

          {/* Game Controls */}
          <div className="space-y-6">
            {/* Ready Status */}
            <Card>
              <CardHeader>
                <CardTitle>Your Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Playing as:</div>
                  <div className="font-semibold text-lg">{playerName}</div>
                </div>
                <Button
                  onClick={handleReadyToggle}
                  className={`w-full ${
                    isReady ? "bg-green-600 hover:bg-green-700" : ""
                  }`}
                  variant={isReady ? "default" : "outline"}
                >
                  {isReady ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" /> {t('room.youAreReady')}
                    </span>
                  ) : (
                    t('room.youAreNotReady')
                  )}
                </Button>

                {isHost && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">
                        {t('room.addBots')}
                      </div>
                      <div className="flex gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Button
                            key={`add-bot-${index + 1}`}
                            onClick={() => handleAddBots(index + 1)}
                            disabled={players.length >= 10 - (index + 1)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            +{index + 1} Bot
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-4 rounded-lg space-y-4">
                        {/* Auto-play toggle */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="auto-play"
                              className="text-sm font-medium"
                            >
                              {t('room.autoPlayTimer')}
                            </Label>
                            <div className="text-xs text-gray-500">
                              {t('room.autoPlayTimerDescription')}
                            </div>
                          </div>
                          <Switch
                            id="auto-play"
                            checked={timerSlideEnabled}
                            onCheckedChange={(checked) => {
                              setTimerSlideEnabled(checked);
                              if (!checked) {
                                setAutoPlayTimeout(0);
                              } else {
                                setAutoPlayTimeout(45);
                              }
                            }}
                          />
                        </div>

                        {/* Timer input - only shown when enabled */}
                        {timerSlideEnabled && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label htmlFor="timer-duration" className="text-sm">
                              {t('room.timerDuration')}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="timer-duration"
                                type="number"
                                min="10"
                                max="300"
                                value={autoPlayTimeout}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setAutoPlayTimeout(
                                    Math.max(10, Math.min(300, value))
                                  );
                                }}
                                className="w-24"
                              />
                              <span className="text-sm text-gray-500">
                                seconds per turn
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              Range: 10-300 seconds
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleStartGame}
                      disabled={!canStartGame}
                      className="w-full cursor-pointer"
                      size="lg"
                    >
                      {canStartGame ? (
                        <span className="flex items-center gap-2">
                          <Rocket className="w-5 h-5" /> {t('room.startGame')}
                        </span>
                      ) : (
                        t('room.waiting')
                      )}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowLeaveDialog(true)}
                  className="w-full"
                >
                  {t('room.leaveRoom')}
                </Button>
              </CardContent>
            </Card>

            {roomCode && playerId && (
              <VoiceChat players={players} localPlayerId={playerId} />
            )}

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('room.gameRequirements')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>{t('room.minPlayers')}:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('room.maxPlayers')}:</span>
                  <span className="font-medium">10</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('room.cardsPerDeck')}:</span>
                  <span className="font-medium">108</span>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  All players must be ready before the host can start the game.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with VoiceChatProvider if room is active
  if (roomCode && playerId) {
    return (
      <VoiceChatProvider
        roomId={roomCode}
        localPlayerId={playerId}
        players={players}
        isHost={isHost}
      >
        {content}
      </VoiceChatProvider>
    );
  }

  return content;
}
