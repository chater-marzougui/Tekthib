#!/usr/bin/env python3
"""
Analyze training log to find which workers didn't stop properly.
"""

import sys
import re
import glob
from pathlib import Path

def analyze_log(log_file):
    """Analyze training log for worker status."""
    
    worker_started = set()
    worker_stopped = set()
    worker_last_activity = {}
    
    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            # Match worker started
            match = re.search(r'\[Worker-(\d+)\s*\].*Worker (\d+) started', line)
            if match:
                worker_id = int(match.group(1))
                worker_started.add(worker_id)
                worker_last_activity[worker_id] = line.strip()
            
            # Match worker stopped
            match = re.search(r'\[Worker-(\d+)\s*\].*Worker (\d+) stopped', line)
            if match:
                worker_id = int(match.group(1))
                worker_stopped.add(worker_id)
                worker_last_activity[worker_id] = line.strip()
            
            # Track any worker activity
            match = re.search(r'\[Worker-(\d+)\s*\]', line)
            if match:
                worker_id = int(match.group(1))
                worker_last_activity[worker_id] = line.strip()
    
    print("="*80)
    print("TRAINING LOG ANALYSIS")
    print("="*80)
    print(f"\nTotal workers started: {len(worker_started)}")
    print(f"Total workers stopped: {len(worker_stopped)}")
    
    # Find workers that didn't stop
    not_stopped = worker_started - worker_stopped
    
    if not_stopped:
        print(f"\n⚠️  Workers that didn't stop properly: {len(not_stopped)}")
        print("\nWorker IDs:", sorted(not_stopped))
        print("\nLast activity for each non-stopped worker:")
        print("-"*80)
        for worker_id in sorted(not_stopped):
            print(f"\nWorker {worker_id}:")
            print(f"  {worker_last_activity.get(worker_id, 'No activity found')}")
    else:
        print("\n✅ All workers stopped properly!")
    
    # Check for "Waiting for workers to complete" message
    with open(log_file, 'r', encoding='utf-8') as f:
        content = f.read()
        if "Waiting for workers to complete" in content:
            print("\n✅ Reached 'Waiting for workers to complete' stage")
        else:
            print("\n⚠️  Never reached 'Waiting for workers to complete' stage")
        
        if "TRAINING COMPLETED SUCCESSFULLY" in content:
            print("✅ Training completed successfully")
        elif "TRAINING INTERRUPTED" in content:
            print("⚠️  Training was interrupted")
        else:
            print("❌ Training did not complete (still running or crashed)")
    
    print("\n" + "="*80)
    
    return not_stopped

if __name__ == "__main__":
    if len(sys.argv) == 2:
        log_file = sys.argv[1]
    else:
        # Find all log files matching the pattern
        log_files = glob.glob(r".\rl_checkpoints_parallel\training_*.log")
        
        if not log_files:
            print("Error: No training log files found in rl_checkpoints_parallel/")
            sys.exit(1)
        
        # Get the latest file by modification time
        log_file = max(log_files, key=lambda f: Path(f).stat().st_mtime)
        print(f"Analyzing log file: {log_file}\n")

    analyze_log(log_file)