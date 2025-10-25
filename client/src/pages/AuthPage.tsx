import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthForm } from "@/hooks/useAuthForm";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthCard from "@/components/auth/AuthCard";
import BluffMeter from "@/components/auth/BluffMeter";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

export default function BluffAuthPage() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { formState, updateField, calculateFormProgress } = useAuthForm();

  const formProgress = calculateFormProgress(isLogin ? "login" : "signup");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.loginUsernameOrEmail || !formState.loginPassword) {
      toast.error(t("auth.pleaseEnterCredentials"));
      return;
    }

    setIsLoading(true);
    try {
      await login(formState.loginUsernameOrEmail, formState.loginPassword);
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
      !formState.signupUsername ||
      !formState.signupEmail ||
      !formState.signupPassword ||
      !formState.signupConfirmPassword
    ) {
      toast.error(t("auth.pleaseEnterAllFields"));
      return;
    }

    if (formState.signupPassword !== formState.signupConfirmPassword) {
      toast.error(t("auth.passwordsDoNotMatch"));
      return;
    }

    if (formState.signupPassword.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      await signup(
        formState.signupUsername,
        formState.signupEmail,
        formState.signupPassword,
        formState.signupDisplayName || formState.signupUsername
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
    <div
      className="flex-1 flex items-center justify-center p-4 overflow-hidden relative
    bg-gradient-to-br dark:from-slate-950 dark:via-purple-950 dark:to-slate-950
    from-purple-200 via-purple-100 to-purple-400
  "
    >
      <AuthBackground />

      {/* Main container */}
      <motion.div
        className="w-full max-w-5xl relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Left side - Playful branding with bluff meter */}
          <div className="flex-1">
            <AuthBranding />
            <BluffMeter
              progress={formProgress}
            />
          </div>

          {/* Right side - Auth form */}
          <AuthCard
            isLogin={isLogin}
            onToggleMode={setIsLogin}
            isLoading={isLoading}
          >
            <AnimatePresence mode="wait">
              {isLogin ? (
                <LoginForm
                  key="login"
                  username={formState.loginUsernameOrEmail}
                  password={formState.loginPassword}
                  onUsernameChange={(value) =>
                    updateField("loginUsernameOrEmail", value)
                  }
                  onPasswordChange={(value) =>
                    updateField("loginPassword", value)
                  }
                  isLoading={isLoading}
                  onSubmit={handleLogin}
                />
              ) : (
                <SignupForm
                  key="signup"
                  username={formState.signupUsername}
                  email={formState.signupEmail}
                  password={formState.signupPassword}
                  confirmPassword={formState.signupConfirmPassword}
                  displayName={formState.signupDisplayName}
                  onUsernameChange={(value) =>
                    updateField("signupUsername", value)
                  }
                  onEmailChange={(value) => updateField("signupEmail", value)}
                  onPasswordChange={(value) =>
                    updateField("signupPassword", value)
                  }
                  onConfirmPasswordChange={(value) =>
                    updateField("signupConfirmPassword", value)
                  }
                  onDisplayNameChange={(value) =>
                    updateField("signupDisplayName", value)
                  }
                  isLoading={isLoading}
                  onSubmit={handleSignup}
                />
              )}
            </AnimatePresence>
          </AuthCard>
        </div>
      </motion.div>
    </div>
  );
}
