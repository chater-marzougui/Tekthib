import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTextDirection } from "@/hooks/useTextDirection";
import Seo from "@/components/SEO";
import ProfileSettingsCard from "@/components/profile/ProfileSettingsCard";
import { UserProfile, GameHistoryItem } from "shared";
import StatOverview from "@/components/profile/StatOverViewCard";
import GameHistory from "@/components/profile/GameHistoryCard";
import { useAuth } from "@/context/AuthContext";

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const direction = useTextDirection();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [settingsView, setSettingsView] = useState(false);

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
  const isSelfProfile = isAuthenticated && user?.id === profile.id;
  const settingsVisible = isSelfProfile && settingsView;

  return (
    <div dir={direction}>
      <Seo
        title={`${displayName} - Player Profile | Tekthib`}
        description={`View ${displayName}'s game statistics and history on Tekthib`}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-2 flex flex-row flex-wrap gap-4 justify-between">
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
            {isSelfProfile && (
              <div className="mt-4">
                <button
                  onClick={() => setSettingsView(!settingsView)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {settingsView ? t("profile.hideSettings") : t("profile.showSettings")}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {settingsVisible ? (
          <ProfileSettingsCard />
        ) : (
          <div>
            {/* Stats Overview */}
            <StatOverview profile={profile} />

            <GameHistory gameHistory={gameHistory} />
          </div>
        )}
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
