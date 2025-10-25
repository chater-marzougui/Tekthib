import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface LoginFormProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (value: string) => void;
  readonly onPasswordChange: (value: string) => void;
  readonly isLoading: boolean;
  readonly onSubmit: (e: React.FormEvent) => void;
}

export default function LoginForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  isLoading,
  onSubmit,
}: Readonly<LoginFormProps>) {
  const { t } = useTranslation();
  const [hoveredInput, setHoveredInput] = useState<string | null>(null);

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, x: -50, rotateY: 90 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: 50, rotateY: -90 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t("auth.usernameOrEmail")}
        </label>
        <motion.input
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          placeholder={t("auth.usernameOrEmailPlaceholder")}
          onFocus={() => setHoveredInput("username")}
          onBlur={() => setHoveredInput(null)}
          whileFocus={{ scale: 1.02 }}
          disabled={isLoading}
        />
        {hoveredInput === "username" && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-purple-400 mt-1"
          >
            {t("auth.inputTooltip")}
          </motion.p>
        )}
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
          onFocus={() => setHoveredInput("password")}
          onBlur={() => setHoveredInput(null)}
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
              {t("auth.loggingIn")}
            </>
          ) : (
            <>{t("auth.loginButton")}</>
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
