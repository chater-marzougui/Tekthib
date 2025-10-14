export const SOUNDS = {
  // General sounds (from general_sounds folder)
  CARD_SELECT: '/Tekthib/sounds/general_sounds/card_select.mp3',
  CHALLENGE_BUTTON_CLICKED: '/Tekthib/sounds/general_sounds/challenge_button_clicked.mp3',
  GAME_START: '/Tekthib/sounds/general_sounds/game_start_5.mp3',
  GAME_START_ALT: '/Tekthib/sounds/general_sounds/game_start_ahh_sht.mp3',
  GOOD_GUITAR: '/Tekthib/sounds/general_sounds/good_guitar_sound.mp3',
  GOT_CHALLENGED_AND_WON: '/Tekthib/sounds/general_sounds/got_challenged_and_won.mp3',
  LOBBY_SOUND: '/Tekthib/sounds/general_sounds/lobby_sound.mp3',
  LOBBY_SOUND_2: '/Tekthib/sounds/general_sounds/lobby_sound_2.mp3',
  PLAYER_JOINED: '/Tekthib/sounds/general_sounds/player_joined_sound.mp3',
  PLAYER_JOINED_2: '/Tekthib/sounds/general_sounds/player_joined_chat_2.mp3',
  PLAYER_JOINED_3: '/Tekthib/sounds/general_sounds/player_joined_3.mp3',
  PLAYER_JOINED_5: '/Tekthib/sounds/general_sounds/player_joined_5.mp3',
  START_GAME_SOUND_3: '/Tekthib/sounds/general_sounds/start_game_sound_3.mp3',
} as const;

// Arrays for random selection
export const WIN_SOUNDS = [
  '/Tekthib/sounds/win_sounds/Dr. Livesey.mp3',
  '/Tekthib/sounds/win_sounds/Galaxy meme.mp3',
  '/Tekthib/sounds/win_sounds/Machi No Dorufin.mp3',
  '/Tekthib/sounds/win_sounds/Meme Snoop Dogg.mp3',
  '/Tekthib/sounds/win_sounds/Snoop Dogg meme.mp3',
  '/Tekthib/sounds/win_sounds/The boys meme Tik tok.mp3',
  '/Tekthib/sounds/win_sounds/Why do I hear boss music.mp3',
  '/Tekthib/sounds/win_sounds/jojo - ayayay.mp3',
  '/Tekthib/sounds/win_sounds/kratos falling meme (dream on).mp3',
  '/Tekthib/sounds/win_sounds/kratos falling meme (dream on) 2.mp3',
  '/Tekthib/sounds/win_sounds/meme man sam.mp3',
  '/Tekthib/sounds/win_sounds/ricardo meme remix.mp3',
];

export const LOSE_SOUNDS = [
  '/Tekthib/sounds/lose_sounds/Directed by Robert B. Weide- theme meme.mp3',
  '/Tekthib/sounds/lose_sounds/Hamster meme.mp3',
  '/Tekthib/sounds/lose_sounds/They ask you how you are meme.mp3',
  '/Tekthib/sounds/lose_sounds/baby_laugh.mp3',
  '/Tekthib/sounds/lose_sounds/cat_laugh.mp3',
  '/Tekthib/sounds/lose_sounds/fail meme song.mp3',
  '/Tekthib/sounds/lose_sounds/sad-meow-song.mp3',
];

export const WIN_ROUND_SOUNDS = [
  '/Tekthib/sounds/win_round_sounds/Can We Get Much Higher-One Piece Meme.mp3',
  '/Tekthib/sounds/win_round_sounds/Galaxy meme.mp3',
  '/Tekthib/sounds/win_round_sounds/Gotcha Bit by Dave Chapelle.mp3',
  '/Tekthib/sounds/win_round_sounds/Machi No Dorufin.mp3',
  '/Tekthib/sounds/win_round_sounds/Meme Snoop Dogg.mp3',
  '/Tekthib/sounds/win_round_sounds/OOOh shit a rat.mp3',
  '/Tekthib/sounds/win_round_sounds/good_guitar_sound.mp3',
  '/Tekthib/sounds/win_round_sounds/im bout to end this man caree.mp3',
  '/Tekthib/sounds/win_round_sounds/kratos falling meme (dream on) 2.mp3',
  '/Tekthib/sounds/win_round_sounds/meme man sam.mp3',
  '/Tekthib/sounds/win_round_sounds/someone_won_a_challenge_player_not_involved.mp3',
];

export const LOSE_ROUND_SOUNDS = [
  '/Tekthib/sounds/lose_round_sounds/A-A-AND YOU FAIL.mp3',
  '/Tekthib/sounds/lose_round_sounds/Akhhhh....mp3',
  '/Tekthib/sounds/lose_round_sounds/Bob Esponja - Fail Sound.mp3',
  '/Tekthib/sounds/lose_round_sounds/Coffin Dance Meme.mp3',
  '/Tekthib/sounds/lose_round_sounds/Directed by Robert B. Weide- theme meme.mp3',
  '/Tekthib/sounds/lose_round_sounds/Emotional Damage Meme.mp3',
  '/Tekthib/sounds/lose_round_sounds/I like your cut, G! (revisited).mp3',
  '/Tekthib/sounds/lose_round_sounds/Machi No Dorufin.mp3',
  '/Tekthib/sounds/lose_round_sounds/Mamma Mia Marcello.mp3',
  '/Tekthib/sounds/lose_round_sounds/OOOh shit a rat.mp3',
  '/Tekthib/sounds/lose_round_sounds/They ask you how you are meme.mp3',
  '/Tekthib/sounds/lose_round_sounds/Why are you Geh.mp3',
  '/Tekthib/sounds/lose_round_sounds/baby_laugh.mp3',
  '/Tekthib/sounds/lose_round_sounds/cards_reveal.mp3',
  '/Tekthib/sounds/lose_round_sounds/cards_reveal_3.mp3',
  '/Tekthib/sounds/lose_round_sounds/cat_laugh.mp3',
  '/Tekthib/sounds/lose_round_sounds/fail meme song.mp3',
  '/Tekthib/sounds/lose_round_sounds/john_fail_funnyyyyy.mp3',
  '/Tekthib/sounds/lose_round_sounds/player_lost_challenge_cards_reveal_more_than_6.mp3',
  '/Tekthib/sounds/lose_round_sounds/reveal_cards_after_losing_challenge.mp3',
];

export const LOBBY_SOUNDS = [
  SOUNDS.LOBBY_SOUND,
  SOUNDS.LOBBY_SOUND_2,
];

export const PLAYER_JOIN_SOUNDS = [
  SOUNDS.PLAYER_JOINED,
  SOUNDS.PLAYER_JOINED_2,
  SOUNDS.PLAYER_JOINED_3,
  SOUNDS.PLAYER_JOINED_5,
];

export const GAME_START_SOUNDS = [
  SOUNDS.GAME_START,
  SOUNDS.GAME_START_ALT,
  SOUNDS.START_GAME_SOUND_3,
];

// Preload list for critical sounds
export const CRITICAL_SOUNDS = [
  SOUNDS.CARD_SELECT,
  SOUNDS.CHALLENGE_BUTTON_CLICKED,
];