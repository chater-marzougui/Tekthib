import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useTextDirection } from "@/hooks/useTextDirection";
import { toast } from "sonner";
export default function ProfileSettingsCard() {
  const { user, isAuthenticated, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const direction = useTextDirection();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      await updateProfile({ display_name: displayName, username });
      toast.success(t("settings.profileUpdated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.updateFailed")
      );
    } finally {
      setIsUpdatingProfile(false);
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
      toast.error(
        error instanceof Error ? error.message : t("settings.updateFailed")
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div dir={direction} className="space-y-6">
      {/* Settings Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Icon icon="mdi:cog" className="w-8 h-8 text-blue-500" />
          {t("settings.title") || "Account Settings"}
        </h2>
        <p className="text-gray-500 mt-2">
          {t("settings.description") || "Manage your profile and security settings"}
        </p>
      </div>

      {/* Profile Information Card */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon icon="mdi:account-circle" className="w-6 h-6 text-blue-500" />
            {t("settings.profileInformation")}
          </CardTitle>
          <CardDescription>
            {t("settings.profileInformationDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Display Name Field */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-base font-semibold flex items-center gap-2">
                <Icon icon="mdi:account" className="w-4 h-4" />
                {t("settings.displayName")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.displayNameDescription")}
              </p>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("settings.displayNamePlaceholder")}
                className="mt-2"
              />
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-semibold flex items-center gap-2">
                <Icon icon="mdi:at" className="w-4 h-4" />
                {t("settings.username")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.usernameDescription")}
              </p>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.usernamePlaceholder")}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isUpdatingProfile ? (
                  <>
                    <Icon
                      icon="mdi:loading"
                      className="w-4 h-4 mr-2 animate-spin"
                    />
                    {t("settings.updating")}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:check" className="w-4 h-4 mr-2" />
                    {t("settings.update")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-l-4 border-l-orange-500 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon icon="mdi:lock-reset" className="w-6 h-6 text-orange-500" />
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription>
            {t("settings.passwordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-base font-semibold flex items-center gap-2">
                <Icon icon="mdi:lock" className="w-4 h-4" />
                {t("settings.currentPassword")}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.currentPasswordPlaceholder")}
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-base font-semibold flex items-center gap-2">
                <Icon icon="mdi:lock-plus" className="w-4 h-4" />
                {t("settings.newPassword")}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.newPasswordPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.passwordMinLength") || "Minimum 6 characters"}
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-semibold flex items-center gap-2">
                <Icon icon="mdi:lock-check" className="w-4 h-4" />
                {t("settings.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmPasswordPlaceholder")}
              />
            </div>

            {/* Password Match Indicator */}
            {newPassword && confirmPassword && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                newPassword === confirmPassword 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                <Icon 
                  icon={newPassword === confirmPassword ? "mdi:check-circle" : "mdi:alert-circle"} 
                  className="w-4 h-4" 
                />
                <span className="text-sm font-medium">
                  {newPassword === confirmPassword 
                    ? t("settings.passwordMatch") || "Passwords match" 
                    : t("settings.passwordMismatch")}
                </span>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isUpdatingPassword}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isUpdatingPassword ? (
                  <>
                    <Icon
                      icon="mdi:loading"
                      className="w-4 h-4 mr-2 animate-spin"
                    />
                    {t("settings.updating")}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:check" className="w-4 h-4 mr-2" />
                    {t("settings.updatePassword")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
