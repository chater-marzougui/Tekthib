#!/usr/bin/env python3
"""
Analyze training logs to find games that didn't end properly and categorize by error type.
"""

import sys
import re
import glob
from pathlib import Path
from collections import defaultdict

def analyze_game_completion(log_file):
    """Analyze training log for incomplete games."""
    
    thread_logs = defaultdict(list)
    
    # Read log file and group by thread
    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            match = re.search(r'\[(\d+)-Thread-(\d+)\s*\(', line)
            if match:
                thread_id = int(match.group(2))
                thread_logs[thread_id].append(line.strip())
    
    print("="*80)
    print("GAME COMPLETION ANALYSIS")
    print("="*80)
    print(f"Total threads found: {len(thread_logs)}\n")
    
    # Analyze each thread
    completed_games = 0
    incomplete_games_with_error = []
    incomplete_games_without_error = []
    
    for thread_id in sorted(thread_logs.keys()):
        logs = thread_logs[thread_id]
        last_log = logs[-1] if logs else ""
        
        # Check if game ended with "Connection closed" message
        connection_closed = any("Connection closed" in log for log in logs)
        
        if connection_closed:
            completed_games += 1
        else:
            # Check if last message is an error
            is_error = "ERROR" in last_log
            
            error_message = None
            if is_error:
                # Extract error message
                error_match = re.search(r'ERROR\s*-\s*(.+)$', last_log)
                if error_match:
                    error_message = error_match.group(1).strip()
                incomplete_games_with_error.append({
                    'thread_id': thread_id,
                    'error': error_message,
                    'last_log': last_log
                })
            else:
                incomplete_games_without_error.append({
                    'thread_id': thread_id,
                    'last_log': last_log
                })
    
    # Print summary
    print("SUMMARY:")
    print(f"  Completed games (with Connection closed): {completed_games}")
    print(f"  Incomplete games with error: {len(incomplete_games_with_error)}")
    print(f"  Incomplete games without error: {len(incomplete_games_without_error)}")
    print(f"  Total incomplete: {len(incomplete_games_with_error) + len(incomplete_games_without_error)}")
    print()
    
    # Print games with errors (grouped by error type)
    if incomplete_games_with_error:
        print("="*80)
        print("GAMES THAT DIDN'T END DUE TO ERRORS:")
        print("="*80)
        
        errors_by_type = defaultdict(list)
        for game in incomplete_games_with_error:
            errors_by_type[game['error']].append(game['thread_id'])
        
        for error_msg in sorted(errors_by_type.keys()):
            thread_ids = errors_by_type[error_msg]
            print(f"\n[{len(thread_ids)} games] Error: {error_msg}")
            print(f"  Thread IDs: {', '.join(map(str, sorted(thread_ids)))}")
        print()
    
    # Print games without errors
    if incomplete_games_without_error:
        print("="*80)
        print("GAMES THAT DIDN'T END (NO ERROR):")
        print("="*80)
        for game in incomplete_games_without_error[:5]:  # Show first 5
            print(f"\nThread {game['thread_id']}:")
            print(f"  Last message: {game['last_log']}")
        if len(incomplete_games_without_error) > 5:
            print(f"\n... and {len(incomplete_games_without_error) - 5} more")
        print()
    
    # Save detailed report to file
    output_file = Path(log_file).parent / "game_completion_analysis.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("GAME COMPLETION ANALYSIS\n")
        f.write("="*80 + "\n")
        f.write(f"Total threads found: {len(thread_logs)}\n\n")
        
        f.write("SUMMARY:\n")
        f.write(f"  Completed games (with Connection closed): {completed_games}\n")
        f.write(f"  Incomplete games with error: {len(incomplete_games_with_error)}\n")
        f.write(f"  Incomplete games without error: {len(incomplete_games_without_error)}\n")
        f.write(f"  Total incomplete: {len(incomplete_games_with_error) + len(incomplete_games_without_error)}\n\n")
        
        if incomplete_games_with_error:
            f.write("="*80 + "\n")
            f.write("GAMES THAT DIDN'T END DUE TO ERRORS:\n")
            f.write("="*80 + "\n")
            
            errors_by_type = defaultdict(list)
            for game in incomplete_games_with_error:
                errors_by_type[game['error']].append(game['thread_id'])
            
            for error_msg in sorted(errors_by_type.keys()):
                thread_ids = errors_by_type[error_msg]
                f.write(f"\n[{len(thread_ids)} games] Error: {error_msg}\n")
                f.write(f"  Thread IDs: {', '.join(map(str, sorted(thread_ids)))}\n")
            f.write("\n")
        
        if incomplete_games_without_error:
            f.write("="*80 + "\n")
            f.write("GAMES THAT DIDN'T END (NO ERROR):\n")
            f.write("="*80 + "\n")
            for game in incomplete_games_without_error:
                f.write(f"\nThread {game['thread_id']}:\n")
                f.write(f"  Last message: {game['last_log']}\n")
            f.write("\n")
    
    print(f"Detailed report saved to: {output_file}")
    return 0

if __name__ == "__main__":
    # Find all log files matching the pattern
    log_files = glob.glob(r".\rl_checkpoints_parallel\training_*.log")
    
    if not log_files:
        print("Error: No training log files found in rl_checkpoints_parallel/")
        sys.exit(1)
    
    # Get the latest file by modification time
    log_file = max(log_files, key=lambda f: Path(f).stat().st_mtime)
    print(f"Analyzing log file: {log_file}\n")

    analyze_game_completion(log_file)
