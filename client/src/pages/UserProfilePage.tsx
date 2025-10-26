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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  textColor?: string;
}> = ({ title, value, textColor = "text-gray-700" }) => (
    <CardContent className="pt-2 text-center">
      <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
      <div className="text-sm text-muted-foreground mt-2">{title}</div>
    </CardContent>
);

const DetailledStatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  details?: string;
}> = ({ title, value, icon, iconColor, details }) => (
  <Card>
    <CardContent className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon icon={icon} className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {details && (
        <div className="text-xs text-muted-foreground mt-1">{details}</div>
      )}
    </CardContent>
  </Card>
);

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const direction = useTextDirection();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getGameResult = (game: GameHistoryItem): string => {
    if (game.is_winner) {
      return t("profile.victory");
    }
    if (game.is_loser) {
      return t("profile.defeat");
    }
    return `${t("profile.position")} #${game.final_position}`;
  };

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
      <div
        dir={direction}
        className="flex items-center justify-center min-h-screen"
      >
        <Icon
          icon="mdi:loading"
          className="w-12 h-12 animate-spin text-gray-600"
        />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        dir={direction}
        className="flex flex-col items-center justify-center min-h-screen"
      >
        <Icon
          icon="mdi:account-alert"
          className="w-16 h-16 text-gray-400 mb-4"
        />
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
  const statsMap = [
    {
      title: t("profile.totalGames"),
      value: profile.stats.total_games,
      textColor: "text-blue-600",
    },
    {
      title: t("profile.wins"),
      value: profile.stats.wins,
      textColor: "text-green-600",
    },
    {
      title: t("profile.losses"),
      value: profile.stats.losses,
      textColor: "text-red-600",
    },
    {
      title: t("profile.winRate"),
      value: `${profile.stats.win_rate.toFixed(1)}%`,
      textColor: "text-purple-600",
    },
  ];

  const detailledStatsMap = [
    {
      title: t("profile.bluffSuccess"),
      value: `${profile.stats.bluff_success_rate.toFixed(1)}%`,
      icon: "mdi:emoticon-devil",
      iconColor: "text-purple-500",
      details: `${profile.stats.successful_bluffs}/${profile.stats.total_bluffs}`,
    },
    {
      title: t("profile.challengeSuccess"),
      value: `${profile.stats.challenge_success_rate.toFixed(1)}%`,
      icon: "mdi:shield-check",
      iconColor: "text-green-500",
      details: `${profile.stats.successful_challenges}/${profile.stats.total_challenges}`,
    },
    {
      title: t("profile.cardsPlayed"),  
      value: profile.stats.total_cards_played,
      icon: "mdi:cards",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div dir={direction}>
      <Seo
        title={`${displayName} - Player Profile | Tekthib`}
        description={`View ${displayName}'s game statistics and history on Tekthib`}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-2">
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
              {statsMap.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  textColor={stat.textColor}
                />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {detailledStatsMap.map((stat) => (
                <DetailledStatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  iconColor={stat.iconColor}
                  details={stat.details}
                />
              ))}
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
                  <Card key={game.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/replay/${game.games.id}`)}>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {game.is_winner && (
                            <Icon
                              icon="mdi:trophy"
                              className="w-5 h-5 text-yellow-500"
                            />
                          )}
                          {game.is_loser && (
                            <Icon icon="mdi:emoticon-sad" className="w-5 h-5" />
                          )}
                          <span className="font-medium">
                            {getGameResult(game)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(game.games.ended_at).toLocaleDateString()}
                          </span>
                          <Icon icon="mdi:play-circle" className="w-5 h-5 text-blue-500" title={t("profile.watchReplay")} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {t("profile.players")}:
                          </span>{" "}
                          {game.games.total_players}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("profile.rounds")}:
                          </span>{" "}
                          {game.games.total_rounds}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("profile.cardsPlayed")}:
                          </span>{" "}
                          {game.cards_played}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("profile.challenges")}:
                          </span>{" "}
                          {game.challenges_made}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
