import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWebSocketContext } from "@/context/WebSocketContext";
import type { Player } from "shared";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { useHeader } from "@/hooks/useHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTextDirection } from "@/hooks/useTextDirection";
import RoomControls from "@/components/room/RoomControls";
import RoomPlayerList from "@/components/room/RoomPlayerList";
import VoiceChat from "@/components/chat/VoiceChat";
import PlayerNameDialog from "@/components/room/PlayerNameDialog";
import RoomGameInfo from "@/components/room/GameInfo";
import RoomHeader from "@/components/room/RoomHeader";
import { useSound } from "@/hooks/useSound";
import { LOBBY_SOUNDS, PLAYER_JOIN_SOUNDS, GAME_START_SOUNDS } from "@/lib/sounds";

function isDuplicatePlayer(players: Player[], newPlayer: Player): boolean {
  return players.some((p) => p.id === newPlayer.id);
}

export default function RoomPage() {
  const { t } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { setHeaderConfig } = useHeader();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();
  const { playRandomSound } = useSound();

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [timerSlideEnabled, setTimerSlideEnabled] = useState(true);
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(45);
  const [challengeSuspenseEnabled, setChallengeSuspenseEnabled] = useState(true);
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

  // Play lobby background music when room is loaded (100% probability)
  useEffect(() => {
    let lobbyAudio: HTMLAudioElement | undefined;
    
    if (roomCode) {
      lobbyAudio = playRandomSound(LOBBY_SOUNDS, { loop: true, volume: 0.3 });
    }
    
    // Cleanup: stop lobby music when leaving the room
    return () => {
      if (lobbyAudio) {
        lobbyAudio.pause();
        lobbyAudio.currentTime = 0;
      }
    };
  }, [roomCode, playRandomSound]);

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
        setChallengeSuspenseEnabled(room.challengeSuspenseEnabled ?? true);
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
        setChallengeSuspenseEnabled(room.challengeSuspenseEnabled ?? true);
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
          
          // Play player join sound (70% probability)
          playRandomSound(PLAYER_JOIN_SOUNDS, { probability: 0.7 });
          
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
        // Play game start sound (100% probability)
        playRandomSound(GAME_START_SOUNDS);
        
        const currentRoomCode = roomCodeRef.current || roomId;
        setTimeout(() => {
          navigate(`/game/${currentRoomCode}`);
        }, 1000);
      }
    });

    const unregisterError = registerHandler("error", (message) => {
      if (message.type === "ERROR") {
        const errorCode = message.payload.code;
        const errorMessage = message.payload.message;
        
        // If game is in progress and player was in it, redirect to game page
        if (errorCode === "GAME_IN_PROGRESS") {
          toast.info(t("room.gameInProgress"));
          const roomCodeFromPayload = message.payload.roomCode;
          if (roomCodeFromPayload) {
            navigate(`/game/${roomCodeFromPayload}`);
          } else {
            navigate("/");
          }
          return;
        }
        
        setError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
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
        toast.success(t("room.botsAddedSuccess"));
      }
    });

    const unregisterBotRemoved = registerHandler("bot-removed", (message) => {
      if (message.type === "BOT_REMOVED") {
        const { players: updatedPlayers } = message.payload;
        setPlayers(updatedPlayers);
        toast.success(t("room.botRemovedSuccess"));
      }
    });

    const unregisterGameReset = registerHandler("game-reset", (message) => {
      if (message.type === "GAME_RESET") {
        const { room } = message.payload;
        setRoomCode(room.code);
        setPlayers(room.players);
        setIsHost(room.hostId === playerId);
        setIsReady(false);
        toast.success(t("room.gameResetSuccess"));
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
          challengeSuspenseEnabled,
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
        payload: { autoPlayTimeout, challengeSuspenseEnabled },
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
      toast.error(t("game.pleaseEnterValidName"));
    }
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

  return (
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
      <PlayerNameDialog
        nameInput={nameInput}
        setNameInput={setNameInput}
        handleNameSubmit={handleNameSubmit}
        showNameDialog={showNameDialog}
      />

      <div className="max-w-full p-4 lg:max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <RoomHeader
          roomCode={roomCode}
          isConnected={isConnected}
          error={error || undefined}
          direction={direction}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Players List */}
          <RoomPlayerList
            players={players}
            playerId={playerId}
            playerName={playerName}
            isHost={isHost}
            handleRemovePlayer={handleRemovePlayer}
            handleReadyToggle={handleReadyToggle}
          />

          <div className="space-y-6" dir={direction}>
            <RoomControls
              playerName={playerName}
              isReady={isReady}
              isHost={isHost}
              players={players}
              canStartGame={canStartGame}
              autoPlayTimeout={autoPlayTimeout}
              setAutoPlayTimeout={setAutoPlayTimeout}
              timerSlideEnabled={timerSlideEnabled}
              setTimerSlideEnabled={setTimerSlideEnabled}
              challengeSuspenseEnabled={challengeSuspenseEnabled}
              setChallengeSuspenseEnabled={setChallengeSuspenseEnabled}
              handleReadyToggle={handleReadyToggle}
              handleStartGame={handleStartGame}
              handleAddBots={handleAddBots}
              setShowLeaveDialog={setShowLeaveDialog}
            />

            {roomCode && playerId && (
              <VoiceChat players={players} localPlayerId={playerId} />
            )}

            {/* Game Info */}
            <RoomGameInfo direction={direction} />
          </div>
        </div>
      </div>
    </div>
  );
}
