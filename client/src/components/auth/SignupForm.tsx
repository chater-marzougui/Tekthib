import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface SignupFormProps {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly displayName: string;
  readonly onUsernameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly onPasswordChange: (value: string) => void;
  readonly onConfirmPasswordChange: (value: string) => void;
  readonly onDisplayNameChange: (value: string) => void;
  readonly isLoading: boolean;
  readonly onSubmit: (e: React.FormEvent) => void;
}

export default function SignupForm({
  username,
  email,
  password,
  confirmPassword,
  displayName,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  isLoading,
  onSubmit,
}: Readonly<SignupFormProps>) {
  const { t } = useTranslation();

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, x: 50, rotateY: 90 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -50, rotateY: -90 }}
      transition={{ duration: 0.4 }}
      className="space-y-1"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.username")}
        </label>
        <motion.input
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.usernamePlaceholder")}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.email")}
        </label>
        <motion.input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.emailPlaceholder")}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.displayName")}
        </label>
        <motion.input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.displayNamePlaceholder")}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.password")}
        </label>
        <motion.input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.passwordPlaceholder")}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.confirmPassword")}
        </label>
        <motion.input
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.confirmPasswordPlaceholder")}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
      </div>

      <motion.button
        type="submit"
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: isLoading ? 1 : 1.05 }}
        whileTap={{ scale: isLoading ? 1 : 0.95 }}
        disabled={isLoading}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                🎴
              </motion.span>
              {t("auth.signingUp")}
            </>
          ) : (
            <>{t("auth.signupButton")}</>
          )}
        </span>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.5 }}
        />
      </motion.button>
    </motion.form>
  );
}
