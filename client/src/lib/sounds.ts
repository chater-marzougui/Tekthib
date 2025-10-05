export const SOUNDS = {
  // Card sounds
  CARD_PLACE: '/sounds/card/card-place.mp3',
  CARD_FLIP: '/sounds/card/card-flip.mp3',
  CARD_SHUFFLE: '/sounds/card/card-shuffle.mp3',
  CARD_SELECT: '/sounds/card/card-select.mp3',
  
  // Game events
  CHALLENGE_START: '/sounds/game/challenge-start.mp3',
  CHALLENGE_SUCCESS: '/sounds/game/challenge-success.mp3',
  CHALLENGE_FAIL: '/sounds/game/challenge-fail.mp3',
  FOUR_OF_KIND: '/sounds/game/four-of-kind.mp3',
  TURN_CHANGE: '/sounds/game/turn-change.mp3',
  
  // UI sounds
  BUTTON_CLICK: '/sounds/ui/button-click.mp3',
  PLAYER_JOIN: '/sounds/ui/player-join.mp3',
  PLAYER_LEAVE: '/sounds/ui/player-leave.mp3',
  NOTIFICATION: '/sounds/ui/notification.mp3',
  
  // Victory sounds
  WIN: '/sounds/victory/win.mp3',
  LOSE: '/sounds/victory/lose.mp3',
  GAME_END: '/sounds/victory/game-end.mp3',
} as const;

// Preload list for critical sounds
export const CRITICAL_SOUNDS = [
  SOUNDS.CARD_PLACE,
  SOUNDS.CHALLENGE_START,
  SOUNDS.TURN_CHANGE,
  SOUNDS.BUTTON_CLICK,
];