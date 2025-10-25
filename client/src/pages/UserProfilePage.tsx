import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTextDirection } from "@/hooks/useTextDirection";
import Seo from "@/components/SEO";

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    total_games: number;
    wins: number;
    losses: number;
    total_cards_played: number;
    total_bluffs: number;
    successful_bluffs: number;
    total_challenges: number;
    successful_challenges: number;
    failed_challenges: number;
    win_rate: number;
    bluff_success_rate: number;
    challenge_success_rate: number;
  };
}

interface GameHistoryItem {
  id: string;
  player_name: string;
  final_position: number;
  cards_played: number;
  bluffs_made: number;
  successful_bluffs: number;
  challenges_made: number;
  successful_challenges: number;
  is_winner: boolean;
  is_loser: boolean;
  created_at: string;
  games: {
    id: string;
    room_code: string;
    started_at: string;
    ended_at: string;
    total_players: number;
    total_rounds: number;
  };
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const direction = useTextDirection();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setError("No username provided");
      setLoading(false);
      return;
    }

    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile by username
      const profileResponse = await fetch(
        `${SERVER_URL}/api/auth/profile/${username}`
      );
      
      if (!profileResponse.ok) {
        throw new Error("User not found");
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);

      // Fetch game history if user is authenticated
      if (profileData.id) {
        const historyResponse = await fetch(
          `${SERVER_URL}/api/auth/user/${profileData.id}/game-history?limit=10`
        );
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setGameHistory(historyData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div dir={direction} className="flex items-center justify-center min-h-screen">
        <Icon icon="mdi:loading" className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div dir={direction} className="flex flex-col items-center justify-center min-h-screen">
        <Icon icon="mdi:account-alert" className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">
          {t("profile.notFound")}
        </h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {t("profile.backHome")}
        </button>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;

  return (
    <div dir={direction}>
      <Seo
        title={`${displayName} - Player Profile | Tekthib`}
        description={`View ${displayName}'s game statistics and history on Tekthib`}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="text-gray-500">@{profile.username}</p>
                <p className="text-sm text-gray-400">
                  {t("profile.memberSince")}{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:chart-bar" className="w-5 h-5" />
              {t("profile.statistics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {profile.stats.total_games}
                </div>
                <div className="text-sm text-gray-600">{t("profile.totalGames")}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {profile.stats.wins}
                </div>
                <div className="text-sm text-gray-600">{t("profile.wins")}</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {profile.stats.losses}
                </div>
                <div className="text-sm text-gray-600">{t("profile.losses")}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {profile.stats.win_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">{t("profile.winRate")}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t("profile.bluffSuccess")}</span>
                  <Icon icon="mdi:emoticon-devil" className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">
                  {profile.stats.bluff_success_rate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {profile.stats.successful_bluffs}/{profile.stats.total_bluffs}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t("profile.challengeSuccess")}</span>
                  <Icon icon="mdi:shield-check" className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">
                  {profile.stats.challenge_success_rate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {profile.stats.successful_challenges}/{profile.stats.total_challenges}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t("profile.cardsPlayed")}</span>
                  <Icon icon="mdi:cards" className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">
                  {profile.stats.total_cards_played}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:history" className="w-5 h-5" />
              {t("profile.recentGames")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                {t("profile.noGamesYet")}
              </p>
            ) : (
              <div className="space-y-3">
                {gameHistory.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {game.is_winner && (
                          <Icon
                            icon="mdi:trophy"
                            className="w-5 h-5 text-yellow-500"
                          />
                        )}
                        {game.is_loser && (
                          <Icon
                            icon="mdi:emoticon-sad"
                            className="w-5 h-5 text-gray-400"
                          />
                        )}
                        <span className="font-medium">
                          {game.is_winner
                            ? t("profile.victory")
                            : game.is_loser
                            ? t("profile.defeat")
                            : `${t("profile.position")} #${game.final_position}`}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(game.games.ended_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">{t("profile.players")}:</span>{" "}
                        {game.games.total_players}
                      </div>
                      <div>
                        <span className="text-gray-600">{t("profile.rounds")}:</span>{" "}
                        {game.games.total_rounds}
                      </div>
                      <div>
                        <span className="text-gray-600">{t("profile.cardsPlayed")}:</span>{" "}
                        {game.cards_played}
                      </div>
                      <div>
                        <span className="text-gray-600">{t("profile.challenges")}:</span>{" "}
                        {game.challenges_made}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            ← {t("profile.backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}
