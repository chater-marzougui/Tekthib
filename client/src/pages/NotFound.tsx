import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Seo from "@/components/SEO";
import { Icon } from "@iconify/react";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const randomNum = Math.floor(Math.random() * 10);

  return (
    <div className="flex-1 flex items-center justify-center">
      <Seo title="404 - Not Found" description="Page not found" />
      <div className="bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Animated 404 Card */}
          <div className="mb-8 relative">
            <div className="relative w-40 h-56 mx-auto">
              {/* Main Card Container */}
              <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-slate-600 overflow-hidden transform transition-transform duration-1000 hover:scale-105">
                {/* Card gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-400 via-pink-400 to-purple-400 opacity-10"></div>

                {/* Top left corner value */}
                <div className="absolute top-4 left-4">
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">
                    {randomNum}
                  </div>
                </div>

                {/* Center - Large question mark with animation */}
                <div className="h-full flex items-center justify-center relative">
                  <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 animate-bounce drop-shadow-lg">
                    ?
                  </div>
                </div>

                {/* Bottom right corner value */}
                <div className="absolute bottom-4 right-4 text-center">
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 rotate-180">
                    {randomNum}
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent opacity-60 animate-pulse"></div>
              </div>

              {/* Floating decorative suits */}
              <div className="absolute -top-4 -left-4 text-4xl animate-pulse">
                ♥
              </div>
              <div className="absolute -bottom-4 -right-4 text-4xl animate-pulse text-red-600">
                ♠
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              {t("notFound.title", "404 - Not Found")}
            </h1>
            <p className="text-foreground/70 text-lg">
              {t(
                "notFound.description",
                "Oops! The page you're looking for doesn't exist or has been moved."
              )}
            </p>
            <p className="text-sm text-foreground/50">
              {t(
                "notFound.hint",
                "It might have been folded into a different deck!"
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
            <Button
              onClick={() => navigate("/")}
              className="gap-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
            >
              <Icon icon="mdi:home" width={20} />
              {t("notFound.backHome", "Back to Home")}
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="gap-2"
            >
              <Icon icon="mdi:arrow-left" width={20} />
              {t("notFound.goBack", "Go Back")}
            </Button>
          </div>

          {/* Decorative element */}
          <div className="mt-6 pt-4 border-t border-foreground/10">
            <p className="text-xs text-foreground/40 font-mono">
              Error Code: 404 | Page Not Found
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
