import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import GameBoard from "@/components/game/GameBoard";
import PlayerList from "@/components/game/PlayerList";
import type { Card as GameCard, Player } from "shared";
import Seo from "@/components/SEO";

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

interface GameEvent {
  id: string;
  game_id: string;
  event_type: string;
  player_user_id: string | null;
  player_name: string;
  event_data: Record<string, unknown>;
  round_number: number | null;
  timestamp: string;
}

interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string | null;
  player_name: string;
  final_position: number;
  cards_played: number;
  bluffs_made: number;
  successful_bluffs: number;
  challenges_made: number;
  successful_challenges: number;
  failed_challenges: number;
  is_winner: boolean;
  is_loser: boolean;
  is_bot: boolean;
}

interface GameDetails {
  id: string;
  room_code: string;
  started_at: string;
  ended_at: string;
  winner_user_id: string | null;
  loser_user_id: string | null;
  total_players: number;
  total_rounds: number;
  total_challenges: number;
  game_settings: Record<string, unknown>;
  game_participants: GameParticipant[];
  game_history: GameEvent[];
}

interface ReplayState {
  currentEventIndex: number;
  players: Player[];
  pile: GameCard[];
  pileCount: number;
  currentRank: string | null;
  lastPlay: {
    player: string;
    cardCount: number;
    claimedRank: string;
  } | null;
  currentPlayerId: string | null;
  winners: string[];
  loser: string | null;
  phase: "waiting" | "playing" | "ended";
  removedCards: GameCard[];
}

export default function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (!gameId) {
      setError("No game ID provided");
      setLoading(false);
      return;
    }

    fetchGameDetails();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/api/auth/replay/${gameId}`);

      if (!response.ok) {
        throw new Error("Game not found");
      }

      const data = await response.json();
      setGameDetails(data);

      // Initialize replay state
      initializeReplayState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
      toast.error(t("replay.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const initializeReplayState = (game: GameDetails) => {
    // Sort events by timestamp
    const sortedEvents = [...game.game_history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Initialize players from participants
    const initialPlayers: Player[] = game.game_participants.map((p) => ({
      id: p.user_id || p.id,
      name: p.player_name,
      cardCount: 0,
      isConnected: true,
      isReady: true,
      isBot: p.is_bot,
    }));

    const initialState: ReplayState = {
      currentEventIndex: -1,
      players: initialPlayers,
      pile: [],
      pileCount: 0,
      currentRank: null,
      lastPlay: null,
      currentPlayerId: null,
      winners: [],
      loser: null,
      phase: "waiting",
      removedCards: [],
    };

    setReplayState(initialState);
  };

  const applyEvent = (state: ReplayState, event: GameEvent): ReplayState => {
    const newState = { ...state };

    switch (event.event_type) {
      case "game_start": {
        newState.phase = "playing";
        const startingPlayerId = event.event_data.startingPlayerId as string;
        newState.currentPlayerId = startingPlayerId;
        
        // Set initial hand sizes (assuming standard distribution)
        const totalCards = 104; // 2 decks
        const cardsPerPlayer = Math.floor(totalCards / newState.players.length);
        newState.players = newState.players.map((p) => ({
          ...p,
          cardCount: cardsPerPlayer,
        }));
        break;
      }

      case "cards_played": {
        const cardsCount = event.event_data.cardsCount as number;
        const claimedRank = event.event_data.claimedRank as string;
        const playerId = event.player_user_id || event.player_name;
        const pileSize = event.event_data.pileSize as number;

        // Update pile
        newState.pileCount = pileSize;
        newState.currentRank = claimedRank;

        // Update last play
        newState.lastPlay = {
          player: event.player_name,
          cardCount: cardsCount,
          claimedRank: claimedRank,
        };

        // Update player's card count
        newState.players = newState.players.map((p) => {
          if (p.id === playerId || p.name === event.player_name) {
            return {
              ...p,
              cardCount: event.event_data.remainingHandSize as number,
            };
          }
          return p;
        });

        // Move to next player (simplified - would need player order from game)
        const currentPlayerIndex = newState.players.findIndex(
          (p) => p.id === playerId || p.name === event.player_name
        );
        const nextPlayerIndex = (currentPlayerIndex + 1) % newState.players.length;
        newState.currentPlayerId = newState.players[nextPlayerIndex].id;
        break;
      }

      case "challenge": {
        const wasLying = event.event_data.wasLying as boolean;
        const pileTakenBy = event.event_data.pileTakenBy as string;
        const cardsCount = event.event_data.cardsCount as number;

        // Reset pile
        newState.pileCount = 0;
        newState.currentRank = null;
        newState.lastPlay = null;

        // Update player who took the pile
        newState.players = newState.players.map((p) => {
          if (p.id === pileTakenBy) {
            return {
              ...p,
              cardCount: p.cardCount + cardsCount,
            };
          }
          return p;
        });

        // Set next player
        if (wasLying) {
          newState.currentPlayerId = event.event_data.challengerId as string;
        } else {
          newState.currentPlayerId = event.event_data.challengedPlayerId as string;
        }
        break;
      }

      case "round_end": {
        // Round ended, typically after a challenge
        break;
      }

      case "game_end": {
        newState.phase = "ended";
        newState.winners = event.event_data.winners as string[];
        newState.loser = event.event_data.loser as string;
        break;
      }
    }

    return newState;
  };

  const stepForward = () => {
    if (!gameDetails || !replayState) return;

    const events = [...gameDetails.game_history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (replayState.currentEventIndex < events.length - 1) {
      const nextIndex = replayState.currentEventIndex + 1;
      const nextEvent = events[nextIndex];
      const newState = applyEvent(replayState, nextEvent);
      setReplayState({ ...newState, currentEventIndex: nextIndex });
    }
  };

  const stepBackward = () => {
    if (!gameDetails || !replayState) return;

    if (replayState.currentEventIndex >= 0) {
      // Replay from start up to previous event
      const events = [...gameDetails.game_history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Reinitialize state
      initializeReplayState(gameDetails);
      
      // Apply events up to the previous index
      setTimeout(() => {
        const targetIndex = replayState.currentEventIndex - 1;
        let newState = { ...replayState, currentEventIndex: -1 };
        
        for (let i = 0; i <= targetIndex; i++) {
          newState = applyEvent(newState, events[i]);
          newState.currentEventIndex = i;
        }
        
        setReplayState(newState);
      }, 50);
    }
  };

  const jumpToEvent = (index: number) => {
    if (!gameDetails || !replayState) return;

    const events = [...gameDetails.game_history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Reinitialize state
    initializeReplayState(gameDetails);
    
    // Apply events up to the target index
    setTimeout(() => {
      let newState = { ...replayState, currentEventIndex: -1 };
      
      for (let i = 0; i <= index; i++) {
        newState = applyEvent(newState, events[i]);
        newState.currentEventIndex = i;
      }
      
      setReplayState(newState);
    }, 50);
  };

  useEffect(() => {
    if (!isPlaying || !gameDetails || !replayState) return;

    const events = [...gameDetails.game_history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (replayState.currentEventIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timeout = setTimeout(() => {
      stepForward();
    }, 2000 / playbackSpeed);

    return () => clearTimeout(timeout);
  }, [isPlaying, replayState?.currentEventIndex, playbackSpeed]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetReplay = () => {
    if (gameDetails) {
      initializeReplayState(gameDetails);
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon
          icon="mdi:loading"
          className="w-12 h-12 animate-spin text-gray-600"
        />
      </div>
    );
  }

  if (error || !gameDetails || !replayState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Icon
          icon="mdi:alert-circle"
          className="w-16 h-16 text-gray-400 mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">
          {t("replay.notFound")}
        </h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>
          {t("replay.goBack")}
        </Button>
      </div>
    );
  }

  const events = [...gameDetails.game_history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const progress = events.length > 0 
    ? ((replayState.currentEventIndex + 1) / events.length) * 100 
    : 0;

  return (
    <div>
      <Seo
        title={`Game Replay - ${gameDetails.room_code} | Tekthib`}
        description="Watch a replay of this Tekthib game"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Replay Badge */}
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg flex items-center gap-2">
            <Icon icon="mdi:play-circle" className="w-6 h-6" />
            {t("replay.replayMode")}
          </div>
        </div>

        {/* Game Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:information" className="w-5 h-5" />
              {t("replay.gameInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("replay.roomCode")}:</span>{" "}
                <span className="font-bold">{gameDetails.room_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("replay.players")}:</span>{" "}
                {gameDetails.total_players}
              </div>
              <div>
                <span className="text-muted-foreground">{t("replay.rounds")}:</span>{" "}
                {gameDetails.total_rounds}
              </div>
              <div>
                <span className="text-muted-foreground">{t("replay.date")}:</span>{" "}
                {new Date(gameDetails.ended_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Board */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <GameBoard
            lastPlay={replayState.lastPlay}
            pileCount={replayState.pileCount}
            currentPlayer={
              replayState.players.find((p) => p.id === replayState.currentPlayerId)?.name || ""
            }
            canChallenge={false}
            onChallenge={() => {}}
            removedCards={replayState.removedCards}
            isMyTurn={false}
            selectedCards={[]}
            onPlayCards={() => {}}
            onCardSelect={() => {}}
            playerCards={[]}
            autoPlayTimeout={0}
            serverTimer={0}
            players={replayState.players.map((p) => ({
              ...p,
              isCurrentTurn: p.id === replayState.currentPlayerId,
            }))}
            currentPlayerId=""
          />

          <div className="gap-4 flex flex-row flex-wrap w-full lg:flex-col lg:w-84">
            <PlayerList
              players={replayState.players.map((p) => ({
                ...p,
                isCurrentTurn: p.id === replayState.currentPlayerId,
              }))}
              currentPlayerId=""
            />
          </div>
        </div>

        {/* Playback Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("replay.event")} {replayState.currentEventIndex + 1} / {events.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Slider
                  value={[replayState.currentEventIndex + 1]}
                  min={0}
                  max={events.length}
                  step={1}
                  onValueChange={(value) => jumpToEvent(value[0] - 1)}
                  className="cursor-pointer"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetReplay}
                  title={t("replay.reset")}
                >
                  <Icon icon="mdi:restart" className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stepBackward}
                  disabled={replayState.currentEventIndex < 0}
                  title={t("replay.stepBack")}
                >
                  <Icon icon="mdi:skip-previous" className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={togglePlayPause}
                  className="w-12 h-12"
                  title={isPlaying ? t("replay.pause") : t("replay.play")}
                >
                  <Icon
                    icon={isPlaying ? "mdi:pause" : "mdi:play"}
                    className="w-6 h-6"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stepForward}
                  disabled={replayState.currentEventIndex >= events.length - 1}
                  title={t("replay.stepForward")}
                >
                  <Icon icon="mdi:skip-next" className="w-5 h-5" />
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm text-muted-foreground">{t("replay.speed")}:</span>
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>

              {/* Current Event Info */}
              {replayState.currentEventIndex >= 0 && events[replayState.currentEventIndex] && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div className="font-semibold mb-2">
                      {t("replay.currentEvent")}: {events[replayState.currentEventIndex].event_type}
                    </div>
                    <div className="text-muted-foreground">
                      {events[replayState.currentEventIndex].player_name} -{" "}
                      {new Date(events[replayState.currentEventIndex].timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            ← {t("replay.goBack")}
          </Button>
        </div>
      </div>
    </div>
  );
}
