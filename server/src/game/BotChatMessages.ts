import { BotPersonality } from 'shared';

// Bot message keys for i18n translation
export const BOT_CHAT_MESSAGES = {
  aggressive: {
    successfulBluff: [
      "bot.aggressive.successfulBluff.thinkLyingAgain",
      "bot.aggressive.successfulBluff.callMeDare",
      "bot.aggressive.successfulBluff.tooScaredChallenge",
      "bot.aggressive.successfulBluff.couldDoAllDay",
      "bot.aggressive.successfulBluff.notBraveEnough",
      "bot.aggressive.successfulBluff.thatsWhatThought",
      "bot.aggressive.successfulBluff.easyMoney",
      "bot.aggressive.successfulBluff.yallTooPredictable",
      "bot.aggressive.successfulBluff.whosNext",
      "bot.aggressive.successfulBluff.watchAndLearn",
      "bot.aggressive.successfulBluff.iRunThisTable",
      "bot.aggressive.successfulBluff.sittingPretty",
    ],
    caughtBluff: [
      "bot.aggressive.caughtBluff.gotcha",
      "bot.aggressive.caughtBluff.calledIt",
      "bot.aggressive.caughtBluff.tooObvious",
      "bot.aggressive.caughtBluff.smellLiar",
      "bot.aggressive.caughtBluff.readLikeBook",
      "bot.aggressive.caughtBluff.notOnWatch",
      "bot.aggressive.caughtBluff.thatsHowDone",
      "bot.aggressive.caughtBluff.cantFoolTwice",
      "bot.aggressive.caughtBluff.justiceServed",
      "bot.aggressive.caughtBluff.sawThroughImmediately",
    ],
    bigPlay: [
      "bot.aggressive.bigPlay.bigMovesOnly",
      "bot.aggressive.bigPlay.goingAllIn",
      "bot.aggressive.bigPlay.thisHowYouPlay",
      "bot.aggressive.bigPlay.watchThis",
      "bot.aggressive.bigPlay.timeToDominate",
      "bot.aggressive.bigPlay.makingPowerMoves",
      "bot.aggressive.bigPlay.shakeThingsUp",
      "bot.aggressive.bigPlay.noFear",
    ],
    random: [
      "bot.aggressive.random.feelingConfident",
      "bot.aggressive.random.moveWontSave",
      "bot.aggressive.random.cardsOnMySide",
      "bot.aggressive.random.speedThisUp",
      "bot.aggressive.random.anyoneElse",
    ],
  },
  truthful: {
    successfulBluff: [
      "bot.truthful.successfulBluff.honestyNotBest",
      "bot.truthful.successfulBluff.neverLie",
      "bot.truthful.successfulBluff.wasUnexpected",
      "bot.truthful.successfulBluff.surpriseMyself",
      "bot.truthful.successfulBluff.rareMoment",
      "bot.truthful.successfulBluff.dontGetUsed",
      "bot.truthful.successfulBluff.conscienceHurts",
      "bot.truthful.successfulBluff.feelsWrong",
    ],
    caughtBluff: [
      "bot.truthful.caughtBluff.justicePrevails",
      "bot.truthful.caughtBluff.cardsSpeakTruth",
      "bot.truthful.caughtBluff.honestyBest",
      "bot.truthful.caughtBluff.truthComesOut",
      "bot.truthful.caughtBluff.couldTellStart",
      "bot.truthful.caughtBluff.liarsNever",
      "bot.truthful.caughtBluff.thatsKarma",
      "bot.truthful.caughtBluff.truthWins",
      "bot.truthful.caughtBluff.knewSomethingOff",
      "bot.truthful.caughtBluff.instinctsRight",
    ],
    bigPlay: [
      "bot.truthful.bigPlay.allLegitimate",
      "bot.truthful.bigPlay.noTricks",
      "bot.truthful.bigPlay.honestPays",
      "bot.truthful.bigPlay.theseAllReal",
      "bot.truthful.bigPlay.playingByRules",
      "bot.truthful.bigPlay.cleanPlayOnly",
    ],
    random: [
      "bot.truthful.random.believeFairPlay",
      "bot.truthful.random.letCardsDecide",
      "bot.truthful.random.playingSafe",
      "bot.truthful.random.noNonsense",
      "bot.truthful.random.justHonest",
    ],
  },
  unpredictable: {
    successfulBluff: [
      "bot.unpredictable.successfulBluff.feelingLucky",
      "bot.unpredictable.successfulBluff.dontKnow",
      "bot.unpredictable.successfulBluff.chaosStrategy",
      "bot.unpredictable.successfulBluff.randomWinning",
      "bot.unpredictable.successfulBluff.actuallyWorked",
      "bot.unpredictable.successfulBluff.pureInstinct",
      "bot.unpredictable.successfulBluff.noPlanVibes",
      "bot.unpredictable.successfulBluff.spontaneityWin",
      "bot.unpredictable.successfulBluff.calculated",
      "bot.unpredictable.successfulBluff.rollingDice",
    ],
    caughtBluff: [
      "bot.unpredictable.caughtBluff.caughtAccident",
      "bot.unpredictable.caughtBluff.brokenClock",
      "bot.unpredictable.caughtBluff.randomGuess",
      "bot.unpredictable.caughtBluff.chaosWins",
      "bot.unpredictable.caughtBluff.didntSeeComing",
      "bot.unpredictable.caughtBluff.neitherDidI",
      "bot.unpredictable.caughtBluff.pureIntuition",
      "bot.unpredictable.caughtBluff.randomWorks",
    ],
    bigPlay: [
      "bot.unpredictable.bigPlay.letChaos",
      "bot.unpredictable.bigPlay.whyNot",
      "bot.unpredictable.bigPlay.yolo",
      "bot.unpredictable.bigPlay.noRhyme",
      "bot.unpredictable.bigPlay.goingGut",
      "bot.unpredictable.bigPlay.throwingCaution",
      "bot.unpredictable.bigPlay.whoKnows",
    ],
    random: [
      "bot.unpredictable.random.interesting",
      "bot.unpredictable.random.hmmMaybe",
      "bot.unpredictable.random.oneWayFind",
      "bot.unpredictable.random.letsSeeHappens",
      "bot.unpredictable.random.whyNotTry",
      "bot.unpredictable.random.keepGuessing",
      "bot.unpredictable.random.expectUnexpected",
    ],
  },
  strategic: {
    successfulBluff: [
      "bot.strategic.successfulBluff.calculated",
      "bot.strategic.successfulBluff.accordingToPlan",
      "bot.strategic.successfulBluff.oddsInFavor",
      "bot.strategic.successfulBluff.expectedOutcome",
      "bot.strategic.successfulBluff.probabilityWorked",
      "bot.strategic.successfulBluff.analyzedCorrectly",
      "bot.strategic.successfulBluff.riskPaidOff",
      "bot.strategic.successfulBluff.foresaw",
      "bot.strategic.successfulBluff.strategySolid",
      "bot.strategic.successfulBluff.playedOdds",
    ],
    caughtBluff: [
      "bot.strategic.caughtBluff.didMath",
      "bot.strategic.caughtBluff.probabilitiesAligned",
      "bot.strategic.caughtBluff.statisticallyUnlikely",
      "bot.strategic.caughtBluff.dataSupported",
      "bot.strategic.caughtBluff.expectedDeceit",
      "bot.strategic.caughtBluff.calculatedRisk",
      "bot.strategic.caughtBluff.analysisCorrect",
      "bot.strategic.caughtBluff.patternRecognized",
      "bot.strategic.caughtBluff.predictedMove",
      "bot.strategic.caughtBluff.logicalConclusion",
    ],
    bigPlay: [
      "bot.strategic.bigPlay.optimalMove",
      "bot.strategic.bigPlay.calculatedPlay",
      "bot.strategic.bigPlay.maximizeValue",
      "bot.strategic.bigPlay.strategicAdvantage",
      "bot.strategic.bigPlay.bestOption",
      "bot.strategic.bigPlay.thoughtThrough",
      "bot.strategic.bigPlay.consideredAlternatives",
      "bot.strategic.bigPlay.weighedOdds",
    ],
    random: [
      "bot.strategic.random.analyzingProbabilities",
      "bot.strategic.random.consideringOptions",
      "bot.strategic.random.interestingPattern",
      "bot.strategic.random.notingBehavior",
      "bot.strategic.random.evaluatingSituation",
      "bot.strategic.random.observingPlay",
      "bot.strategic.random.gatheringData",
    ],
  },
};

export type BotChatContext = 
  | 'successfulBluff'
  | 'caughtBluff'
  | 'bigPlay'
  | 'random';

/**
 * Get a random chat message key for a bot based on personality and context
 * Returns an i18n translation key that should be translated on the client side
 */
export function getBotChatMessage(
  personality: BotPersonality,
  context: BotChatContext,
): string {
  const messages = BOT_CHAT_MESSAGES[personality][context];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Determine if bot should send a chat message based on context
 */
export function shouldBotChat(context: BotChatContext): boolean {
  const probabilities: Record<BotChatContext, number> = {
    successfulBluff: 0.15,
    caughtBluff: 0.25,
    bigPlay: 0.10,
    random: 0.05,
  };

  return Math.random() < probabilities[context];
}
