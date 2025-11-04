#!/usr/bin/env python3
"""
Extract progress lines from RL training log files.

Extracts lines containing training progress metrics (eps/hr, win rate, epsilon, etc.)
and optionally saves them to a CSV file for analysis.

Usage:
    python extract_progress.py <log_file>
    python extract_progress.py <log_file> --output progress.csv
    python extract_progress.py rl_checkpoints_20w_2k/training_*.log
"""

import re
import csv
import argparse
import sys
from pathlib import Path
from datetime import datetime


def extract_progress_lines(log_file):
    """
    Extract progress lines from log file.
    
    Progress lines contain: eps/hr metric
    Expected format: "📈 Progress: 477/2000 episodes | WR: 44.0% | AP: 2.71 | Speed: 2816.5 eps/hr | ε: 0.665 | ..."
    
    Args:
        log_file: Path to log file
        
    Yields:
        dict: Parsed progress data
    """
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                # Check if this is a progress line (contains "Progress:" and "eps/hr")
                if 'Progress:' in line and 'eps/hr' in line:
                    data = _parse_progress_line(line)
                    if data:
                        yield data
                    
    except FileNotFoundError:
        print(f"❌ Error: File not found: {log_file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading file: {e}", file=sys.stderr)
        sys.exit(1)


def _parse_progress_line(line):
    """Parse a single progress line and extract data."""
    data = {'raw_line': line.strip()}
    
    # Regex patterns for extracting data
    patterns = {
        'timestamp': r'^(\d{2}:\d{2}:\d{2})',
        'episodes': r'Progress: (\d+)/(\d+) episodes',
        'win_rate': r'WR: ([\d.]+)%',
        'avg_placement': r'AP: ([\d.]+)',
        'speed': r'Speed: ([\d.]+) eps/hr',
        'epsilon': r'ε: ([\d.]+)',
        'buffer': r'Buffer: (\d+)\+(\d+)',
        'training': r'Training: (\d+)'
    }
    
    # Extract timestamp
    if match := re.search(patterns['timestamp'], line):
        data['timestamp'] = match.group(1)
    
    # Extract episodes
    if match := re.search(patterns['episodes'], line):
        data['current_episodes'] = int(match.group(1))
        data['total_episodes'] = int(match.group(2))
        data['progress_pct'] = (data['current_episodes'] / data['total_episodes']) * 100
    
    # Extract win rate
    if match := re.search(patterns['win_rate'], line):
        data['win_rate'] = float(match.group(1))
    
    # Extract average placement
    if match := re.search(patterns['avg_placement'], line):
        data['avg_placement'] = float(match.group(1))
    
    # Extract speed
    if match := re.search(patterns['speed'], line):
        data['eps_per_hour'] = float(match.group(1))
    
    # Extract epsilon
    if match := re.search(patterns['epsilon'], line):
        data['epsilon'] = float(match.group(1))
    
    # Extract buffer sizes
    if match := re.search(patterns['buffer'], line):
        data['card_buffer'] = int(match.group(1))
        data['challenge_buffer'] = int(match.group(2))
        data['total_buffer'] = data['card_buffer'] + data['challenge_buffer']
    
    # Extract training threads
    if match := re.search(patterns['training'], line):
        data['training_threads'] = int(match.group(1))
    
    return data


def print_progress_data(data_list):
    """Print progress data in a formatted table."""
    if not data_list:
        print("❌ No progress lines found in log file")
        return
    
    print("\n" + "="*90)
    print("📊 TRAINING PROGRESS ANALYSIS")
    print("="*90)
    print(f"{'Time':<10} {'Episodes':<15} {'Progress':<12} {'WR%':<8} {'AP':<6} {'eps/hr':<12} {'ε':<8} {'Buffer':<18}")
    print("-"*90)

    for data in data_list:
        time_str = data.get('timestamp', '??:??:??')
        episodes_str = f"{data.get('current_episodes', 0)}/{data.get('total_episodes', 0)}"
        progress_str = f"{data.get('progress_pct', 0):.1f}%"
        wr_str = f"{data.get('win_rate', 0):.1f}%"
        ap_str = f"{data.get('avg_placement', 0):.2f}"
        speed_str = f"{data.get('eps_per_hour', 0):.0f}"
        epsilon_str = f"{data.get('epsilon', 0):.3f}"
        buffer_str = f"{data.get('total_buffer', 0)} ({data.get('card_buffer', 0)}+{data.get('challenge_buffer', 0)})"
        
        print(f"{time_str:<10} {episodes_str:<15} {progress_str:<12} {wr_str:<8} {ap_str:<6} {speed_str:<12} {epsilon_str:<8} {buffer_str:<18}")

    print("="*90 + "\n")


def save_to_csv(data_list, output_file):
    """Save progress data to CSV file."""
    if not data_list:
        print("❌ No data to save")
        return
    
    fieldnames = [
        'timestamp', 'current_episodes', 'total_episodes', 'progress_pct',
        'win_rate', 'avg_placement', 'eps_per_hour', 'epsilon',
        'card_buffer', 'challenge_buffer', 'total_buffer', 'training_threads'
    ]
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for data in data_list:
                # Only write fields that exist
                row = {field: data.get(field, '') for field in fieldnames}
                writer.writerow(row)
        
        print(f"✅ Progress data saved to: {output_file}")
        print(f"📊 Extracted {len(data_list)} progress lines")
        
    except Exception as e:
        print(f"❌ Error saving to CSV: {e}", file=sys.stderr)
        sys.exit(1)


def print_statistics(data_list):
    """Print statistics from progress data."""
    if not data_list:
        return
    
    print("\n" + "="*60)
    print("📈 TRAINING STATISTICS")
    print("="*60)
    
    # Extract relevant fields
    eps_per_hour = [d['eps_per_hour'] for d in data_list if 'eps_per_hour' in d]
    win_rates = [d['win_rate'] for d in data_list if 'win_rate' in d]
    epsilons = [d['epsilon'] for d in data_list if 'epsilon' in d]
    avg_placements = [d['avg_placement'] for d in data_list if 'avg_placement' in d]
    
    if eps_per_hour:
        print("\n⚡ Speed (eps/hr):")
        print(f"  Min:    {min(eps_per_hour):.0f}")
        print(f"  Max:    {max(eps_per_hour):.0f}")
        print(f"  Avg:    {sum(eps_per_hour)/len(eps_per_hour):.0f}")
    
    if win_rates:
        print("\n🏆 Win Rate (%):")
        print(f"  Min:    {min(win_rates):.1f}%")
        print(f"  Max:    {max(win_rates):.1f}%")
        print(f"  Avg:    {sum(win_rates)/len(win_rates):.1f}%")
        print(f"  Latest: {win_rates[-1]:.1f}%")
    
    if avg_placements:
        print("\n📊 Avg Placement:")
        print(f"  Min:    {min(avg_placements):.2f}")
        print(f"  Max:    {max(avg_placements):.2f}")
        print(f"  Avg:    {sum(avg_placements)/len(avg_placements):.2f}")
        print(f"  Latest: {avg_placements[-1]:.2f}")
    
    if epsilons:
        print("\n🎲 Epsilon (exploration):")
        print(f"  Start:  {epsilons[0]:.3f}")
        print(f"  End:    {epsilons[-1]:.3f}")
        print(f"  Decay:  {(1 - epsilons[-1]/epsilons[0])*100:.1f}%")
    
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Extract training progress lines from log files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_progress.py training_20251103_120000.log
  python extract_progress.py training_*.log --output progress.csv
  python extract_progress.py rl_checkpoints_20w_2k/training_*.log --stats
        """
    )
    
    parser.add_argument('log_file', nargs='+',
                       help='Log file(s) to extract from (supports wildcards)')
    parser.add_argument('--output', '-o', type=str,
                       help='Output CSV file for progress data')
    parser.add_argument('--stats', action='store_true',
                       help='Print detailed statistics')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Suppress table output, only show stats/save CSV')
    
    args = parser.parse_args()
    
    # Handle multiple files (via wildcard)
    log_files = []
    for pattern in args.log_file:
        log_files.extend(Path('.').glob(pattern))
    
    if not log_files:
        print("❌ No log files found matching pattern(s)")
        sys.exit(1)
    
    all_data = []
    
    # Process each log file
    for log_file in sorted(log_files):
        print(f"📂 Processing: {log_file}")
        data_list = list(extract_progress_lines(str(log_file)))
        all_data.extend(data_list)
    
    if not all_data:
        print("❌ No progress lines found in any log file")
        sys.exit(1)
    
    # Display results
    if not args.quiet:
        print_progress_data(all_data)
    
    # Save to CSV if requested
    if args.output:
        save_to_csv(all_data, args.output)
    
    # Print statistics
    if args.stats or args.output:
        print_statistics(all_data)


if __name__ == "__main__":
    main()
