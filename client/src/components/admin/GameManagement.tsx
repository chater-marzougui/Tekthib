import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import LoadingSpinner from "../LoadingSpinner";

interface GameParticipant {
  player_name: string;
  is_winner: boolean;
  is_loser: boolean;
  is_bot: boolean;
  final_position: number;
}

interface Game {
  id: string;
  room_code: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  total_players: number;
  total_rounds: number;
  total_challenges: number;
  winner_user_id: string | null;
  loser_user_id: string | null;
  game_participants: GameParticipant[];
}

interface GameManagementProps {
  baseUrl: string;
  password: string;
}

function getBgColor(p: GameParticipant): string {
  if (p.is_winner) {
    return "bg-green-100";
  }
  if (p.is_loser) {
    return "bg-red-100";
  }
  return "bg-gray-100";
}

export default function GameManagement({
  baseUrl,
  password,
}: Readonly<GameManagementProps>) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGames, setTotalGames] = useState(0);

  const fetchGames = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/admin/db/games?password=${encodeURIComponent(password)}&page=${page}&limit=50`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();
      setGames(data.games);
      setTotalPages(data.pagination.totalPages);
      setTotalGames(data.pagination.total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching games:", error);
      toast.error("Failed to fetch games");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(1);
  }, []);

  const handleDeleteGame = async (gameId: string, roomCode: string) => {
    if (
      !confirm(
        `Are you sure you want to delete game ${roomCode}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/db/games/${gameId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete game");
      }

      toast.success(`Game ${roomCode} deleted successfully`);
      fetchGames(currentPage);
    } catch (error) {
      console.error("Error deleting game:", error);
      toast.error("Failed to delete game");
    }
  };

  const handleSeeReplay = (gameId: string) => {
    const replayUrl = `/Tekthib/replay/${gameId}`;
    window.open(replayUrl, "_blank");
  };

  const filteredGames = games.filter(
    (game) =>
      game.room_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Game Management</h2>
          <p className="text-sm text-muted-foreground">
            Total: {totalGames} games
          </p>
        </div>
        <Button onClick={() => fetchGames(currentPage)} disabled={isLoading}>
          <>
            <Icon icon="mdi:refresh" className="w-4 h-4 mr-2" /> Refresh
          </>
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search games by room code or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {filteredGames.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {searchTerm
              ? "No games found matching your search"
              : "No games in database"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game) => {
            return (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Room: {game.room_code}
                        <span className="text-sm font-normal text-muted-foreground">
                          {game.total_players} players
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Game ID: {game.id.slice(0, 24)}...
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDeleteGame(game.id, game.room_code)
                        }
                      >
                        <Icon icon="mdi:delete" className="w-4 h-4 mr-1" />
                        Delete
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSeeReplay(game.id)}
                      >
                        <Icon icon="mdi:delete" className="w-4 h-4 mr-1" />
                        See Replay
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div className="font-medium">
                        {new Date(game.started_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">
                        {game.duration_minutes
                          ? `${Math.floor(game.duration_minutes)} min`
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rounds</div>
                      <div className="font-medium">{game.total_rounds}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Challenges</div>
                      <div className="font-medium">{game.total_challenges}</div>
                    </div>
                  </div>

                  {/* Players */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Players:</h4>
                    <div className="flex flex-wrap gap-2">
                      {game.game_participants
                        .sort((a, b) => a.final_position - b.final_position)
                        .map((participant, idx) => (
                          <div
                            key={idx + 1}
                            className={`px-3 py-1 text-background rounded-full text-xs flex items-center gap-1 ${getBgColor(
                              participant
                            )}`}
                          >
                            {participant.is_winner && (
                              <Icon icon="mdi:trophy" className="w-3 h-3 text-yellow-500" />
                            )}
                            {participant.player_name}
                            {participant.is_bot && " (Bot)"}
                            {participant.is_loser && " 💀"}
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGames(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <Icon icon="mdi:chevron-left" className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGames(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            <Icon icon="mdi:chevron-right" className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
