import { useState, useCallback } from "react";

export type FormMode = "login" | "signup";

interface FormState {
  loginUsernameOrEmail: string;
  loginPassword: string;
  signupUsername: string;
  signupEmail: string;
  signupPassword: string;
  signupConfirmPassword: string;
  signupDisplayName: string;
}

export function useAuthForm() {
  const [formState, setFormState] = useState<FormState>({
    loginUsernameOrEmail: "",
    loginPassword: "",
    signupUsername: "",
    signupEmail: "",
    signupPassword: "",
    signupConfirmPassword: "",
    signupDisplayName: "",
  });

  // Calculate bluff meter based on form completion
  const calculateFormProgress = useCallback((mode: FormMode): number => {
    if (mode === "login") {
      const fields = [
        formState.loginUsernameOrEmail,
        formState.loginPassword,
      ];
      const filledFields = fields.filter((f) => f.trim().length > 0).length;
      return Math.round((filledFields / fields.length) * 100); // 0-50% for login
    } else {
      const fields = [
        formState.signupUsername,
        formState.signupEmail,
        formState.signupPassword,
        formState.signupConfirmPassword,
        formState.signupDisplayName,
      ];
      const filledFields = fields.filter((f) => f.trim().length > 0).length;
      const baseProgress = Math.round((filledFields / fields.length) * 100); // 50-100% for signup
      return baseProgress;
    }
  }, [formState]);

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormState({
      loginUsernameOrEmail: "",
      loginPassword: "",
      signupUsername: "",
      signupEmail: "",
      signupPassword: "",
      signupConfirmPassword: "",
      signupDisplayName: "",
    });
  }, []);

  return {
    formState,
    updateField,
    resetForm,
    calculateFormProgress,
  };
}
