import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useTextDirection } from "@/hooks/useTextDirection";
import Seo from "@/components/SEO";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const { user, isAuthenticated, updateProfile, updateUsername, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const direction = useTextDirection();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      await updateProfile({ display_name: displayName });
      toast.success(t("settings.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.updateFailed"));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingUsername(true);

    try {
      await updateUsername(username);
      toast.success(t("settings.usernameUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.updateFailed"));
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await updatePassword(currentPassword, newPassword);
      toast.success(t("settings.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.updateFailed"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div dir={direction}>
      <Seo
        title={`${t("settings.title")} | Tekthib`}
        description={t("settings.description")}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Icon icon="mdi:arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        </div>

        {/* Display Name Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:account-edit" className="w-5 h-5" />
              {t("settings.displayName")}
            </CardTitle>
            <CardDescription>{t("settings.displayNameDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("settings.displayNamePlaceholder")}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? (
                  <>
                    <Icon icon="mdi:loading" className="w-4 h-4 mr-2 animate-spin" />
                    {t("settings.updating")}
                  </>
                ) : (
                  t("settings.update")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Username Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:at" className="w-5 h-5" />
              {t("settings.username")}
            </CardTitle>
            <CardDescription>{t("settings.usernameDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <Label htmlFor="username">{t("settings.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("settings.usernamePlaceholder")}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={isUpdatingUsername}>
                {isUpdatingUsername ? (
                  <>
                    <Icon icon="mdi:loading" className="w-4 h-4 mr-2 animate-spin" />
                    {t("settings.updating")}
                  </>
                ) : (
                  t("settings.update")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:lock-reset" className="w-5 h-5" />
              {t("settings.changePassword")}
            </CardTitle>
            <CardDescription>{t("settings.passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("settings.currentPasswordPlaceholder")}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("settings.newPasswordPlaceholder")}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("settings.confirmPasswordPlaceholder")}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? (
                  <>
                    <Icon icon="mdi:loading" className="w-4 h-4 mr-2 animate-spin" />
                    {t("settings.updating")}
                  </>
                ) : (
                  t("settings.updatePassword")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
