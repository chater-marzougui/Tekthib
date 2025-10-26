import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { useAvatar } from "@/hooks/useAvatar";
import { useSound } from "@/hooks/useSound";
import React from "react";
import { useNavigate } from "react-router-dom";

const countryOptions = [
  {
    value: "english",
    name: "English",
    code: "en",
    flagUrl: "/Tekthib/flags/gb.webp",
    altText: "United Kingdom Flag",
  },
  {
    value: "arabic",
    name: "Arabic",
    code: "ar",
    flagUrl: "/Tekthib/flags/tn.webp",
    altText: "Tunisia Flag",
  },
  {
    value: "france",
    name: "France",
    code: "fr",
    flagUrl: "/Tekthib/flags/fr.webp",
    altText: "France Flag",
  },
];

interface RenderDropdownItemProps {
  title: string;
  iconName: string;
  iconClass?: string;
  enabled: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const RenderDropdownItem = ({
  onClick,
  title,
  enabled,
  iconName,
  iconClass,
}: RenderDropdownItemProps) => {
  return (
    <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
      <label className="flex w-full items-center justify-between">
        <span>{title}</span>
        <button
          className="relative inline-block w-10 h-6"
          onClick={(e) => onClick(e)}
        >
          <span
            className={`absolute inset-0 rounded-full transition-colors duration-200 ${
              enabled ? "bg-green-400" : "bg-gray-300"
            }`}
          />
          <span
            className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
              enabled ? "translate-x-4" : "translate-x-0"
            } flex items-center justify-center`}
          >
            <Icon icon={iconName} className={`h-4 w-4 ${iconClass || ""}`} />
          </span>
        </button>
      </label>
    </DropdownMenuItem>
  );
};

export function NavUser() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { soundEffectsEnabled, toggleSoundEffects } = useSound();
  const { user, isAuthenticated, logout, updatePreferences } = useAuth();
  const navigate = useNavigate();
  const playerId = localStorage.getItem("clientId");
  const randomStr = Math.random().toString(36).substring(2, 15);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // User settings
  const [showBotMessages, setShowBotMessages] = React.useState(() => {
    const saved = localStorage.getItem("showBotMessages");
    if (saved === null) {
      return true;
    }
    return saved === "true";
  });
  const [showSystemMessages, setShowSystemMessages] = React.useState(() => {
    const saved = localStorage.getItem("showSystemMessages");
    if (saved === null) {
      return true;
    }
    return saved === "true";
  });
  const [showChallengeToasts, setShowChallengeToasts] = React.useState(() => {
    const saved = localStorage.getItem("showChallengeToasts");
    if (saved === null) {
      return true;
    }
    return saved === "true";
  });

  const avatarSvg = useAvatar(playerId || randomStr);

  const handleLanguageChange = (language: string) => {
    if (i18n.language === language) return;
    i18n.changeLanguage(language);
    localStorage.setItem("locale", language);

    // Sync with database if authenticated
    if (isAuthenticated) {
      updatePreferences({ locale: language }).catch((error) => {
        console.error("Failed to sync locale preference:", error);
      });
    }
  };

  const handleChangeTheme = (
    e: React.MouseEvent<HTMLButtonElement>,
    newTheme: "dark" | "light"
  ) => {
    e.stopPropagation();

    // Get click coordinates for the circular reveal animation
    const x = e.clientX;
    const y = e.clientY;

    // Calculate the radius needed to cover the entire screen from the click point
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Check if browser supports View Transitions API
    if (!document.startViewTransition) {
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);
      return;
    }

    // Start the view transition
    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);

      // Sync with database if authenticated
      if (isAuthenticated) {
        updatePreferences({ theme: newTheme }).catch((error) => {
          console.error("Failed to sync theme preference:", error);
        });
      }
    });

    // Animate the circular reveal
    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
          fill: "forwards",
        }
      );

      // Fade out the new pseudo-element at the very end to reveal the real DOM
      setTimeout(() => {
        document.documentElement.animate(
          {
            opacity: [1, 0],
          },
          {
            duration: 50, // Very short fade to mask cleanup
            easing: "ease-out",
            pseudoElement: "::view-transition-new(root)",
            fill: "forwards",
          }
        );
      }, 480); // Start fade 20ms before clip-path animation ends
    });
  };

  const toggleFullscreen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
    } else {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    }
  };

  const toggleSetting = (
    e: React.MouseEvent<HTMLButtonElement>,
    setting: "bot" | "system" | "challenge",
    currentValue: boolean
  ) => {
    e.stopPropagation();
    const newValue = !currentValue;

    switch (setting) {
      case "bot":
        setShowBotMessages(newValue);
        localStorage.setItem("showBotMessages", String(newValue));
        if (isAuthenticated) {
          updatePreferences({ show_bot_messages: newValue }).catch((error) => {
            console.error("Failed to sync bot messages preference:", error);
          });
        }
        break;
      case "system":
        setShowSystemMessages(newValue);
        localStorage.setItem("showSystemMessages", String(newValue));
        if (isAuthenticated) {
          updatePreferences({ show_system_messages: newValue }).catch(
            (error) => {
              console.error(
                "Failed to sync system messages preference:",
                error
              );
            }
          );
        }
        break;
      case "challenge":
        setShowChallengeToasts(newValue);
        localStorage.setItem("showChallengeToasts", String(newValue));
        if (isAuthenticated) {
          updatePreferences({ show_challenge_toasts: newValue }).catch(
            (error) => {
              console.error(
                "Failed to sync challenge toasts preference:",
                error
              );
            }
          );
        }
        break;
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const QuickActions: RenderDropdownItemProps[] = [
    {
      title: t("nav.showBotMessages"),
      iconName: showBotMessages ? "mdi:check" : "mdi:close",
      enabled: showBotMessages,
      onClick: (e) => toggleSetting(e, "bot", showBotMessages),
    },
    {
      title: t("nav.showSystemMessages"),
      iconName: showSystemMessages ? "mdi:check" : "mdi:close",
      enabled: showSystemMessages,
      onClick: (e) => toggleSetting(e, "system", showSystemMessages),
    },
    {
      title: t("nav.showChallengeToasts"),
      iconName: showChallengeToasts ? "mdi:check" : "mdi:close",
      enabled: showChallengeToasts,
      onClick: (e) => toggleSetting(e, "challenge", showChallengeToasts),
    },
    {
      title: t("nav.soundEffects"),
      iconName: soundEffectsEnabled ? "mdi:volume-high" : "mdi:volume-off",
      enabled: soundEffectsEnabled,
      onClick: (_) => toggleSoundEffects(),
    },
  ];

  return (
    <div className="sticky flex items-center gap-2 cursor-pointer">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={`w-10 h-10 ring-2 ${isAuthenticated ? "ring-green-500" : "ring-red-600"} rounded-full overflow-hidden flex items-center justify-center bg-gray-300`}
                dangerouslySetInnerHTML={{ __html: avatarSvg! }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                {isAuthenticated && user ? (
                  <DropdownMenuItem
                    onClick={() => navigate(`/profile/${user.username}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:account" className="w-4 h-4" />
                      <div>
                        <div className="font-semibold">
                          {user.display_name || user.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("nav.viewProfile")}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ) : null}

                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        logout();
                        }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Icon icon="mdi:logout" className="mr-2 h-4 w-4 text-red-600" />
                      <span>{t("auth.logout")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => navigate("/auth")}
                      className="cursor-pointer"
                    >
                      <Icon icon="mdi:login" className="mr-2 h-4 w-4" />
                      <span>{t("auth.login")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <RenderDropdownItem
                  key={t("nav.toggleDarkMode")}
                  title={t("nav.toggleDarkMode")}
                  enabled={theme === "dark"}
                  iconName={
                    theme === "light"
                      ? "mdi:white-balance-sunny"
                      : "mdi:moon-waning-crescent"
                  }
                  iconClass={
                    theme === "light" ? "text-yellow-500" : "text-gray-700"
                  }
                  onClick={(e) =>
                    handleChangeTheme(e, theme === "dark" ? "light" : "dark")
                  }
                />

                <RenderDropdownItem
                  title={t("nav.fullscreen")}
                  iconName={
                    isFullscreen ? "mdi:fullscreen-exit" : "mdi:fullscreen"
                  }
                  enabled={isFullscreen}
                  onClick={toggleFullscreen}
                />

                <DropdownMenuSeparator />

                {QuickActions.map((action) => (
                  <RenderDropdownItem
                    key={action.title}
                    title={action.title}
                    iconName={action.iconName}
                    enabled={action.enabled}
                    onClick={action.onClick}
                  />
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="dark:hover:text-accent-foreground">
                    <span className="flex flex-1 items-center gap-2">
                      {t("nav.language")}
                      <Icon
                        icon="mdi:translate"
                        className="ml-auto h-[1.2rem] w-[1.2rem]"
                      />
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {countryOptions.map((country) => {
                        return (
                          <DropdownMenuItem
                            key={country.code}
                            onClick={() => handleLanguageChange(country.code)}
                          >
                            <img
                              className="w-8 aspect-[3/2] rounded-sm border-[1px]"
                              src={country.flagUrl}
                              alt={country.altText}
                            />
                            <span className="ml-2">{country.name}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
