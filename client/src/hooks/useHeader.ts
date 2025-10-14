import { HeaderContext } from "@/context/HeaderContext";
import { useContext } from "react";


export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}
