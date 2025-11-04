#!/usr/bin/env python3
"""
Analyze training log to find which workers didn't stop properly.
"""

import sys
import re
import glob
from pathlib import Path

def analyze_game(log_file, thread_number):
    """Analyze training log for worker status."""
    thread_activity = []
    num_matches = 0
    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            # Track any thread activity
            match = re.search(r'\[(\d+)-Thread-(\d+)\s*\(', line)
            if match:
                found_thread = int(match.group(2))
                if found_thread == thread_number:
                    num_matches += 1
                    thread_activity.append(line.strip())
    
    print("="*80)
    print(f"THREAD {thread_number} LOG ANALYSIS - Total Matches: {num_matches}")
    print("="*80)

    # Save to file
    output_file = Path(log_file).parent / f"thread_{thread_number}.log"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"THREAD {thread_number} LOG ANALYSIS - Total Matches: {num_matches}\n")
        f.write("="*80 + "\n")
        for activity in thread_activity:
            f.write(activity + "\n")
    
    print(f"\nSaved to: {output_file}")
    return 0

if __name__ == "__main__":
    if len(sys.argv) == 2:
        thread_number = int(sys.argv[1])
    else:
        print("Usage: python extract-game.py <thread_number>")
        sys.exit(1)
    # Find all log files matching the pattern
    log_files = glob.glob(r".\rl_checkpoints_parallel\training_*.log")
    
    if not log_files:
        print("Error: No training log files found in rl_checkpoints_parallel/")
        sys.exit(1)
    
    # Get the latest file by modification time
    log_file = max(log_files, key=lambda f: Path(f).stat().st_mtime)
    print(f"Analyzing log file: {log_file}\n")

    analyze_game(log_file, thread_number)