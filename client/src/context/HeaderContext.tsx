import { createContext, useState, useMemo, ReactNode } from "react";

export interface HeaderActionButton {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  readonly color?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly middleElement?: ReactNode;
}

interface HeaderState {
  actionButton?: HeaderActionButton;
  showLogo: boolean;
  logoUrl: string;
  showName: boolean;
  showNameInMobile?: boolean;
  appName: string;
  middleElement?: ReactNode;
}

interface HeaderContextType {
  headerState: HeaderState;
  setActionButton: (button?: HeaderActionButton) => void;
  clearActionButton: () => void;
  setHeaderConfig: (config: Partial<HeaderState>) => void;
  resetHeader: () => void;
}

const defaultHeaderState: HeaderState = {
  actionButton: undefined,
  showLogo: true,
  logoUrl: "/Tekthib/icons/logo-96.png",
  showName: true,
  appName: "Tekthib",
  middleElement: undefined,
  showNameInMobile: true,
};

export const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [headerState, setHeaderState] =
    useState<HeaderState>(defaultHeaderState);

  const setActionButton = (button?: HeaderActionButton) => {
    setHeaderState((prev) => ({ ...prev, actionButton: button }));
  };

  const clearActionButton = () => {
    setHeaderState((prev) => ({ ...prev, actionButton: undefined }));
  };

  const setHeaderConfig = (config: Partial<HeaderState>) => {
    setHeaderState((prev) => ({ ...prev, ...config }));
  };

  const resetHeader = () => {
    setHeaderState(defaultHeaderState);
  };

  const value = useMemo(
    () => ({
      headerState,
      setActionButton,
      clearActionButton,
      setHeaderConfig,
      resetHeader,
    }),
    [headerState]
  );

  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  );
}