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
import { useAvatar } from "@/hooks/useAvatar";

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

export function NavUser() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const playerId = localStorage.getItem("clientId");
  const randomStr = Math.random().toString(36).substring(2, 15);

  const avatarSvg = useAvatar(playerId || randomStr);

  const handleLanguageChange = (language: string) => {
    if (i18n.language === language) return;
    i18n.changeLanguage(language);
    localStorage.setItem("locale", language);
  };

  const handleChangeTheme = (
    e: React.MouseEvent<HTMLButtonElement>,
    newTheme: "dark" | "light"
  ) => {
    e.stopPropagation();
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="sticky flex items-center gap-2 cursor-pointer">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={`w-10 h-10 ring-2 ring-blue-500 rounded-full overflow-hidden flex items-center justify-center bg-gray-300`}
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
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <label className="flex w-full items-center justify-between">
                    <span>{t("nav.toggleDarkMode")}</span>
                    <button
                      className="relative inline-block w-10 h-6"
                      onClick={(e) =>
                        handleChangeTheme(
                          e,
                          theme === "dark" ? "light" : "dark"
                        )
                      }
                    >
                      <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors duration-200" />
                      <span
                        className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                          theme === "dark" ? "translate-x-4" : "translate-x-0"
                        } flex items-center justify-center`}
                      >
                        {theme === "dark" ? (
                          <Icon
                            icon="mdi:white-balance-sunny"
                            className="h-4 w-4"
                          />
                        ) : (
                          <Icon
                            icon="mdi:moon-waning-crescent"
                            className="h-4 w-4"
                          />
                        )}
                      </span>
                    </button>
                  </label>
                </DropdownMenuItem>

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
