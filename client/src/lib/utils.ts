import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { t } from "i18next";
import { ToastMessage } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getToastMessage(
  wasLying: boolean,
  playerName: string,
  challengerName: string,
  lastPlayerName: string,
  revealedCardsLength: number = 0
): ToastMessage {
  let resultMessage = "";
  let resultDescription = "";
  let toastColor: "green" | "red" | "blue" = "blue";
  if (wasLying && lastPlayerName === playerName) {
    resultMessage = t("game.caughtLying", {
      challenger: challengerName,
    });
    resultDescription = t("game.learnToPlay");
    toastColor = "red";
  } else if (wasLying && challengerName === playerName) {
    resultMessage = t("game.youAreRight", { player: lastPlayerName });
    toastColor = "green";
  } else if (!wasLying && lastPlayerName === playerName) {
    resultMessage = t("game.wellPlayed", {
      challenger: challengerName,
    });
    resultDescription = t("game.tellingTheTruth");
    toastColor = "green";
  } else if (!wasLying && challengerName === playerName) {
    resultMessage = t("game.wrongChallenge", {
      player: lastPlayerName,
    });
    resultDescription = t("game.penaltyCards", {
      count: revealedCardsLength,
    });
    toastColor = "red";
  } else {
    resultMessage = wasLying
      ? t("game.playerWasLying", { player: lastPlayerName })
      : t("game.playerWasTruthful", { player: lastPlayerName });

    resultDescription = t("game.playerChallenged", {
      challenger: challengerName,
      player: lastPlayerName,
    });
  }

  return {
    message: resultMessage,
    description: resultDescription,
    color: toastColor,
  };
}
