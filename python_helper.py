import os

# Root folder of your project (change this if needed)
root_dir = "."

# What to look for
needle = "import { useTranslation"

untranslated_files = []
toSkip_dirs = {".git", "node_modules", "dist", "build", "out", ".next", 'ui', 'context', 'hooks'}
for root, _, files in os.walk(root_dir):
    if any(skip in root for skip in toSkip_dirs):
        continue
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if needle not in content:
                        untranslated_files.append(path)
            except Exception as e:
                print(f"Could not read {path}: {e}")

if untranslated_files:
    print("\nFiles without useTranslate import:\n")
    for f in untranslated_files:
        print(f" - {f}")
else:
    print(" All TSX files contain 'import { useTranslate }'.")
