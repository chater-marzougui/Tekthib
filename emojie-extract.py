import os
import re
import datetime

# Config
PROJECT_PATH = r"C:\Users\chate\Desktop\Takthib"   # <-- change if needed
OUTPUT_FILE = "emojis_found.txt"
EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".html"}
print(f" Configured to scan files with extensions: {', '.join(EXTENSIONS)}")

# Emoji regex: matches standalone + composite emojis
emoji_pattern = re.compile(
    "["                                   # Start of character set
    "\U0001F1E6-\U0001F1FF"               # Flags
    "\U0001F300-\U0001F5FF"               # Misc Symbols & Pictographs
    "\U0001F600-\U0001F64F"               # Emoticons
    "\U0001F680-\U0001F6FF"               # Transport & Map
    "\U0001F700-\U0001F77F"               # Alchemical
    "\U0001F780-\U0001F7FF"               # Geometric Extended
    "\U0001F800-\U0001F8FF"               # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"               # Supplemental Symbols
    "\U0001FA00-\U0001FA6F"               # Chess / Extended-A
    "\U0001FA70-\U0001FAFF"               # Symbols Extended-B
    "\u2600-\u26FF"                       # Misc symbols
    "\u2700-\u27BF"                       # Dingbats
    "]",
    flags=re.UNICODE
)

results = []
total_files = 0
files_with_emojis = 0

print(f" Searching for emojis in: {PROJECT_PATH}")
print(f" Output file: {OUTPUT_FILE}\n")

toSkip_dirs = {"node_modules", ".git", "server", "dist", "build", "out"}
toSkip_files = {"BotChatMessages.ts", "EndGameDialog.tsx", "RenderCard.tsx"}

for root, _, files in os.walk(PROJECT_PATH):
    if any(skip in root for skip in toSkip_dirs):
        continue  # skip node_modules

    for filename in files:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in EXTENSIONS:
            continue

        if filename in toSkip_files:
            continue  # skip this script file

        total_files += 1
        filepath = os.path.join(root, filename)

        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                for line_number, line in enumerate(f, start=1):
                    if emoji_pattern.search(line):
                        matches = emoji_pattern.findall(line)
                        for emoji in matches:
                            results.append({
                                "emoji": emoji,
                                "file": filepath,
                                "line": line_number,
                                "content": line.strip()
                            })
                        files_with_emojis += 1
        except Exception as e:
            print(f" Could not read file {filepath}: {e}")

if results:
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("EMOJI EXTRACTION REPORT\n")
        out.write("=" * 80 + "\n")
        out.write(f"Generated: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n")
        out.write(f"Total Files Scanned: {total_files}\n")
        out.write(f"Files with Emojis: {files_with_emojis}\n")
        out.write(f"Total Emojis Found: {len(results)}\n")
        out.write("=" * 80 + "\n\n")

        for r in results:
            out.write(f"Emoji: {r['emoji']}\n")
            out.write(f"File:  {r['file'].replace(PROJECT_PATH, '.')}\n")
            out.write(f"Line:  {r['line']}\n")
            out.write(f"Text:  {r['content']}\n")
            out.write("-" * 80 + "\n")

    print(f" Found {len(results)} emoji(s) in {files_with_emojis} file(s)")
    print(f" Results saved to: {OUTPUT_FILE}")
else:
    print(" No emojis found in the project.")

print(f"\n Scan complete! Processed {total_files} files.")
