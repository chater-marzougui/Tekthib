import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
import type { Player } from "shared";
import { toast } from "sonner";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import { Icon } from "@iconify/react";
import { QRCodeCard } from "@/components/QRCodeDialog";
import { useHeader } from "@/context/HeaderContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTextDirection } from "@/hooks/useTextDirection";
import RoomControls from "@/components/room/RoomControls";
import RoomPlayerList from "@/components/room/RoomPlayerList";

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
  const direction = useTextDirection();

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
      if (message.type !== "PLAYER_LEFT") {
        return;
      }
      const { playerId: leftPlayerId, newHostId } = message.payload;
      setPlayers((prev) => prev.filter((p) => p.id !== leftPlayerId));
      if (newHostId && newHostId === playerId) {
        setIsHost(true);
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
      middleElement: (
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Icon icon="mdi:gamepad-variant" className="w-8 h-8" />{" "}
          {t("room.gameLobby")}
        </h2>
      ),
      actionButton: {
        label: t("room.leaveRoom"),
        onClick: () => setShowLeaveDialog(true),
        variant: "destructive",
        color: "default",
      },
    });

    return () => {
      setHeaderConfig({
        middleElement: undefined,
        actionButton: undefined,
      });
    };
  }, [t, roomCode]);

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
        title={t("confirmDialog.leaveRoomTitle")}
        description={t("confirmDialog.leaveRoomDescription")}
        confirmText={t("confirmDialog.leave")}
        cancelText={t("confirmDialog.cancel")}
        variant="destructive"
      />

      {/* Name prompt dialog */}
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("room.enterYourName")}</DialogTitle>
            <DialogDescription>{t("room.enterNameToJoin")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">{t("room.yourName")}</Label>
              <Input
                id="player-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t("room.enterYourName")}
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
              {t("room.joinRoom")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          {!isConnected && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
              {t("room.connectingToServer")}
            </div>
          )}
          <div
            className="flex items-center justify-center gap-4"
            dir={direction}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {t("room.roomCode")}:
              </span>
              <Button
                variant="outline"
                onClick={copyRoomCode}
                className="font-mono text-lg px-4 cursor-pointer"
                disabled={!roomCode}
              >
                {roomCode || t("common.loading")}
              </Button>
              {roomCode && <QRCodeCard roomCode={roomCode} />}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players List */}
          <RoomPlayerList
            players={players}
            playerId={playerId}
            playerName={playerName}
            isHost={isHost}
            handleRemovePlayer={handleRemovePlayer}
            handleReadyToggle={handleReadyToggle}
          />

          <RoomControls
            playerName={playerName}
            isReady={isReady}
            isHost={isHost}
            playerId={playerId}
            roomCode={roomCode}
            players={players}
            canStartGame={canStartGame}
            autoPlayTimeout={autoPlayTimeout}
            setAutoPlayTimeout={setAutoPlayTimeout}
            timerSlideEnabled={timerSlideEnabled}
            setTimerSlideEnabled={setTimerSlideEnabled}
            handleReadyToggle={handleReadyToggle}
            handleStartGame={handleStartGame}
            handleAddBots={handleAddBots}
            setShowLeaveDialog={setShowLeaveDialog}
          />
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
