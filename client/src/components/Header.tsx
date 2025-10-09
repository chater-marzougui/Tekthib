import { NavUser } from "./NavUser";
import { Button } from "@/components/ui/button";
import { useHeader } from "@/context/HeaderContext";

export function Header() {
  const { headerState } = useHeader();
  const { actionButton, showLogo, logoUrl, showName, appName } = headerState;
  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60"
    >
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left Side - Logo and Name */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <div className="flex items-center w-12 h-6">
              <img src={logoUrl} alt={`${appName} Logo`} />
            </div>
          )}
          {showName && (
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {appName}
            </h1>
          )}
        </div>

        {/* Right Side - Action Button and NavUser */}
        <div className="flex items-center gap-10">
          {actionButton && (
            <Button
              onClick={actionButton.onClick}
              variant={actionButton.variant || "default"}
              disabled={actionButton.disabled || actionButton.loading}
              className={
                actionButton.color ? `hover:opacity-90 transition-opacity` : ""
              }
              style={
                actionButton.color
                  ? {
                      backgroundColor: actionButton.color,
                      color: "white",
                      borderColor: actionButton.color,
                    }
                  : undefined
              }
            >
              {actionButton.loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>{actionButton.label}</span>
                </div>
              ) : (
                actionButton.label
              )}
            </Button>
          )}
          <NavUser />
        </div>
      </div>
    </header>
  );
}

export default Header;
