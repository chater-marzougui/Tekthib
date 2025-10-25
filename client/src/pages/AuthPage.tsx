import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AuthPage() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginUsernameOrEmail, setLoginUsernameOrEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsernameOrEmail || !loginPassword) {
      toast.error(t("auth.pleaseEnterCredentials"));
      return;
    }

    setIsLoading(true);
    try {
      await login(loginUsernameOrEmail, loginPassword);
      toast.success(t("auth.loginSuccess"));
      navigate("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.loginFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !signupUsername ||
      !signupEmail ||
      !signupPassword ||
      !signupConfirmPassword
    ) {
      toast.error(t("auth.pleaseEnterAllFields"));
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error(t("auth.passwordsDoNotMatch"));
      return;
    }

    if (signupPassword.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      await signup(
        signupUsername,
        signupEmail,
        signupPassword,
        signupDisplayName || signupUsername
      );
      toast.success(t("auth.signupSuccess"));
      navigate("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.signupFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Icon
                icon={isLogin ? "mdi:login" : "mdi:account-plus"}
                className="w-6 h-6"
                style={{ color: "#3b82f6" }}
              />
              {isLogin ? t("auth.login") : t("auth.signup")}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin
                ? t("auth.loginDescription")
                : t("auth.signupDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username-email">
                    {t("auth.usernameOrEmail")}
                  </Label>
                  <Input
                    id="login-username-email"
                    type="text"
                    value={loginUsernameOrEmail}
                    onChange={(e) => setLoginUsernameOrEmail(e.target.value)}
                    placeholder={t("auth.usernameOrEmailPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? t("auth.loggingIn") : t("auth.login")}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">{t("auth.username")}</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder={t("auth.usernamePlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">
                    {t("auth.displayName")}
                  </Label>
                  <Input
                    id="signup-display-name"
                    type="text"
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                    placeholder={t("auth.displayNamePlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">
                    {t("auth.confirmPassword")}
                  </Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? t("auth.signingUp") : t("auth.signup")}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin
                  ? t("auth.noAccountSignup")
                  : t("auth.haveAccountLogin")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
