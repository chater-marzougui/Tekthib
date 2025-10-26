import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserPreferences {
  theme: string;
  locale: string;
  sound_effects_enabled: boolean;
  show_bot_messages: boolean;
  show_system_messages: boolean;
  show_challenge_toasts: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  preferences: UserPreferences | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    displayName?: string,
    clientId?: string | null
  ) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (updates: {
    display_name?: string;
    username?: string;
  }) => Promise<void>;
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SERVER_URL =
  import.meta.env.VITE_API_URL || "https://takthib-a00f145250bc.herokuapp.com";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Load preferences from server
      loadPreferences(storedToken);
    }
    setIsLoading(false);
  }, []);

  const loadPreferences = async (authToken: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/preferences`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
        // Apply preferences to localStorage for immediate use
        applyPreferencesToLocalStorage(prefs);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  };

  const applyPreferencesToLocalStorage = (prefs: UserPreferences) => {
    localStorage.setItem("theme", prefs.theme);
    localStorage.setItem("locale", prefs.locale);
    localStorage.setItem("showBotMessages", String(prefs.show_bot_messages));
    localStorage.setItem(
      "showSystemMessages",
      String(prefs.show_system_messages)
    );
    localStorage.setItem(
      "showChallengeToasts",
      String(prefs.show_challenge_toasts)
    );
    // Note: soundEffectsEnabled is handled by useSound hook
  };

  const login = async (usernameOrEmail: string, password: string) => {
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    setPreferences(data.preferences);

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("clientId", data.user.id);

    // Apply preferences to localStorage
    if (data.preferences) {
      applyPreferencesToLocalStorage(data.preferences);
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    displayName?: string,
    clientId?: string | null
  ) => {
    const response = await fetch(`${SERVER_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        displayName,
        clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Signup failed");
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("clientId", data.clientId);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPreferences(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${SERVER_URL}/api/auth/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(prefs),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update preferences");
    }

    const updatedPrefs = await response.json();
    setPreferences(updatedPrefs);
    applyPreferencesToLocalStorage(updatedPrefs);
  };

  const updateProfile = async (updates: {
    display_name?: string;
    username?: string;
  }) => {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${SERVER_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    const updatedUser = await response.json();
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const updatePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${SERVER_URL}/api/auth/profile/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update password");
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      preferences,
      login,
      signup,
      logout,
      updatePreferences,
      updateProfile,
      updatePassword,
      isAuthenticated: !!user && !!token,
      isLoading,
    }),
    [user, token, preferences, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
