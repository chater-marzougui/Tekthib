# EndGame Dialog Translation Implementation

## Summary
Applied translations to the EndGameDialog component by creating separate `endgame.json` translation files in each locale.

## Files Created

### 1. English (`client/public/locales/en/endgame.json`)
Contains all English translations for:
- Dialog title and description
- Winners/Loser sections
- Player statistics labels
- Achievement titles (Rookie, Clown, Master Liar, Detective, etc.)
- Button labels

### 2. French (`client/public/locales/fr/endgame.json`)
Contains all French translations for the same content.

### 3. Arabic (`client/public/locales/ar/endgame.json`)
Contains all Arabic translations for the same content.

## Files Modified

### 1. `client/src/i18n.ts`
- Added imports for the three new `endgame.json` files
- Registered the `endgame` namespace in the resources object for each language

### 2. `client/src/components/game/EndGameDialog.tsx`
- Added `useTranslation` hook import and usage
- Updated all hardcoded strings to use translation keys with the `endgame:` namespace
- Modified `calculateTitles` function to accept a translation function parameter
- All UI text now uses `t("endgame:...")` for translations

## Translation Keys Structure

```
endgame:
  dialog:
    - title
    - description
  winners:
    - title
  loser:
    - title
    - message
  statistics:
    - title
    - labels:
      - you
      - loser
      - caughtBluffing
      - successfulBluffs
      - falseAccusations
      - toldTruth
  titles:
    - rookie
    - clown / coClown
    - masterLiar / masterDeceiver
    - saint / coSaint
    - detective / coDetective
    - transparentPlayer
    - professionalGuesser
    - lastOneStanding
    - perfectPokerFace
    - openBook
    - riskTaker
  buttons:
    - playAgain
    - returnHome
```

## Usage
The translations will automatically switch based on the user's selected language. The `endgame` namespace is now loaded alongside the main `translation` namespace.

## Notes
- All emojis are preserved in the translations (included in the JSON values)
- You can manually edit the translation files to adjust any text as needed
- The translations follow the same structure across all three languages for consistency
