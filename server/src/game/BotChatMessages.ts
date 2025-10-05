import { BotPersonality } from 'shared';

export const BOT_CHAT_MESSAGES = {
  aggressive: {
    successfulBluff: [
      "You think I'm lying again, human? 😏",
      "Call me if you dare!",
      "Too scared to challenge?",
      "I could do this all day! 💪",
      "Not brave enough?",
      "That's what I thought...",
      "Easy money!",
      "Y'all too predictable 😎",
      "Who's next?",
      "Watch and learn!",
      "I run this table! 🔥",
      "Sitting pretty with these cards!",
    ],
    caughtBluff: [
      "GOTCHA! Knew you were lying! 🎯",
      "Called it! Take those cards!",
      "Too obvious, my friend!",
      "I can smell a liar from miles away!",
      "Read you like a book! 📖",
      "Not on my watch!",
      "That's how it's done!",
      "You can't fool me twice!",
      "Justice served! ⚖️",
      "Saw through that immediately!",
    ],
    bigPlay: [
      "Big moves only! 💥",
      "Going all in!",
      "This is how you play!",
      "Watch this!",
      "Time to dominate! 👑",
      "Making power moves!",
      "Let's shake things up!",
      "No fear!",
    ],
    random: [
      "Feeling confident today!",
      "Your move won't save you...",
      "The cards are on my side!",
      "Let's speed this up!",
      "Anyone else want some? 😤",
    ],
  },
  truthful: {
    successfulBluff: [
      "Sometimes honesty isn't the best policy... 🤫",
      "I never lie... or do I?",
      "That was... unexpected for me",
      "Even I surprise myself sometimes",
      "A rare moment of deception",
      "Don't get used to this!",
      "My conscience hurts a little 😅",
      "This feels wrong but... it worked!",
    ],
    caughtBluff: [
      "Justice prevails! ⚖️",
      "These cards speak the truth!",
      "Honesty is the best policy!",
      "The truth always comes out!",
      "I could tell from the start!",
      "Liars never prosper!",
      "That's karma for you!",
      "Truth wins again! ✨",
      "I knew something was off!",
      "My instincts were right!",
    ],
    bigPlay: [
      "All legitimate cards, I assure you!",
      "No tricks here, just skill!",
      "Honest play pays off!",
      "These are all real!",
      "Playing by the rules! 📜",
      "Clean play only!",
    ],
    random: [
      "I believe in fair play",
      "Let the cards decide",
      "Playing it safe...",
      "No nonsense here!",
      "Just being honest 😊",
    ],
  },
  unpredictable: {
    successfulBluff: [
      "Feeling lucky? 🎲",
      "Even I don't know what I'm doing!",
      "Chaos is my strategy!",
      "Random = winning?",
      "That... actually worked? 😂",
      "Pure instinct!",
      "No plan, all vibes!",
      "Spontaneity for the win!",
      "Calculated? No. Lucky? Maybe!",
      "Rolling the dice! 🎰",
    ],
    caughtBluff: [
      "Caught you! By accident... but still! 😄",
      "Even a broken clock is right twice!",
      "My random guess paid off!",
      "Chaos wins again!",
      "Didn't see that coming, did you?",
      "Neither did I! 🤪",
      "Pure intuition!",
      "Sometimes random works!",
    ],
    bigPlay: [
      "Let chaos decide! 🌪️",
      "Why not?",
      "YOLO! 💫",
      "No rhyme or reason!",
      "Going with my gut!",
      "Throwing caution to the wind!",
      "Who knows what'll happen!",
    ],
    random: [
      "Interesting... 🤔",
      "Hmm... or maybe not?",
      "One way to find out!",
      "Let's see what happens!",
      "Why not try this?",
      "Keeping you guessing! 😉",
      "Expect the unexpected!",
    ],
  },
};

export type BotChatContext = 
  | 'successfulBluff'
  | 'caughtBluff'
  | 'bigPlay'
  | 'random';

/**
 * Get a random chat message for a bot based on personality and context
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
