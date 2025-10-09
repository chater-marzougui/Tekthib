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
import { Button } from "@/components/ui/button";
import { Moon, Sun, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeProvider";
import { useAvatar } from "@/hooks/useAvatar";

const countryOptions = [
  {
    value: "france",
    name: "France",
    code: "fr",
    flagUrl: "/flags/fr.webp",
    altText: "France Flag",
  },
  {
    value: "english",
    name: "English",
    code: "en",
    flagUrl: "/flags/gb.webp",
    altText: "United Kingdom Flag",
  },
  {
    value: "arabic",
    name: "Arabic",
    code: "ar",
    flagUrl: "/flags/tn.webp",
    altText: "Tunisia Flag",
  },
];

export function NavUser() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const playerId = localStorage.getItem("clientId");
  const randomStr = Math.random().toString(36).substring(2, 15);

  const avatarSvg = useAvatar(playerId || randomStr);

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem("locale", language);
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={"ghost"}
                size="lg"
                className="flex h-9 w-9 items-center rounded-full p-0 hover:bg-transparent active:bg-transparent cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center`}
                  dangerouslySetInnerHTML={{ __html: avatarSvg! }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <div className="flex w-full justify-between">
                    <span>{t("nav.toggleDarkMode")}</span>
                    {theme === "light" ? (
                      <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
                    ) : (
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
                    )}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="dark:hover:text-accent-foreground">
                    <span className="flex flex-1 items-center gap-2">
                      {t("nav.language")}
                      <Languages className="ml-auto h-[1.2rem] w-[1.2rem]" />
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
                              className="aspect-[3/2] w-auto rounded-sm border-[1px]"
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
