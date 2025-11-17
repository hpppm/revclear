#!/usr/bin/env python3
"""
Audio conversion utility for converting various formats to WAV.
Based on AWS sample: https://github.com/aws-samples/sample-bedrock-whisper-pii-audio-summarizer
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from pydub import AudioSegment
except ImportError:
    print("Error: pydub is not installed. Install it with: pip install pydub")
    print("Note: ffmpeg must also be installed on your system")
    sys.exit(1)


def convert_to_wav(input_file: str, output_file: str = None, sample_rate: int = 16000) -> str:
    """
    Convert audio file to WAV format optimized for Whisper.
    
    Args:
        input_file: Path to input audio file
        output_file: Optional output file path (auto-generated if not provided)
        sample_rate: Target sample rate in Hz (default: 16000 for Whisper)
        
    Returns:
        Path to output WAV file
    """
    input_path = Path(input_file)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")
    
    # Auto-generate output filename if not provided
    if output_file is None:
        output_file = str(input_path.with_suffix('.wav'))
    
    output_path = Path(output_file)
    
    print(f"Converting {input_file} to WAV format...")
    print(f"Target sample rate: {sample_rate} Hz")
    
    try:
        # Load audio file
        audio = AudioSegment.from_file(input_file)
        
        # Convert to mono and resample
        audio = audio.set_channels(1)  # Mono
        audio = audio.set_frame_rate(sample_rate)
        
        # Export as WAV
        audio.export(
            output_file,
            format='wav',
            parameters=['-acodec', 'pcm_s16le']  # 16-bit PCM
        )
        
        # Get file sizes
        input_size = input_path.stat().st_size / (1024 * 1024)  # MB
        output_size = output_path.stat().st_size / (1024 * 1024)  # MB
        
        print(f"✓ Conversion complete!")
        print(f"  Input:  {input_file} ({input_size:.2f} MB)")
        print(f"  Output: {output_file} ({output_size:.2f} MB)")
        print(f"  Duration: {len(audio) / 1000:.2f} seconds")
        
        return output_file
        
    except Exception as e:
        print(f"Error converting audio: {str(e)}")
        raise


def get_audio_info(file_path: str):
    """Get information about an audio file."""
    try:
        audio = AudioSegment.from_file(file_path)
        
        print(f"\nAudio File Information:")
        print(f"  File: {file_path}")
        print(f"  Duration: {len(audio) / 1000:.2f} seconds")
        print(f"  Channels: {audio.channels}")
        print(f"  Sample Rate: {audio.frame_rate} Hz")
        print(f"  Sample Width: {audio.sample_width * 8} bits")
        print(f"  Frame Rate: {audio.frame_rate} Hz")
        print(f"  Frame Width: {audio.frame_width} bytes")
        
    except Exception as e:
        print(f"Error reading audio file: {str(e)}")


def batch_convert(input_dir: str, output_dir: str = None, sample_rate: int = 16000):
    """
    Convert all audio files in a directory to WAV format.
    
    Args:
        input_dir: Directory containing audio files
        output_dir: Output directory (uses input_dir if not specified)
        sample_rate: Target sample rate in Hz
    """
    input_path = Path(input_dir)
    
    if not input_path.is_dir():
        raise ValueError(f"Input directory not found: {input_dir}")
    
    if output_dir is None:
        output_path = input_path
    else:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
    
    # Supported audio formats
    extensions = ['.mp3', '.mp4', '.m4a', '.flac', '.ogg', '.webm', '.aac']
    
    audio_files = []
    for ext in extensions:
        audio_files.extend(input_path.glob(f'*{ext}'))
        audio_files.extend(input_path.glob(f'*{ext.upper()}'))
    
    if not audio_files:
        print(f"No audio files found in {input_dir}")
        return
    
    print(f"Found {len(audio_files)} audio file(s) to convert\n")
    
    for i, audio_file in enumerate(audio_files, 1):
        print(f"[{i}/{len(audio_files)}] Converting {audio_file.name}...")
        
        output_file = output_path / f"{audio_file.stem}.wav"
        
        try:
            convert_to_wav(str(audio_file), str(output_file), sample_rate)
        except Exception as e:
            print(f"  ✗ Failed: {str(e)}")
            continue
    
    print(f"\n✓ Batch conversion complete! Processed {len(audio_files)} files")


def main():
    parser = argparse.ArgumentParser(
        description='Convert audio files to WAV format optimized for Whisper'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Convert command
    convert_parser = subparsers.add_parser('convert', help='Convert a single file')
    convert_parser.add_argument('input', help='Input audio file')
    convert_parser.add_argument('-o', '--output', help='Output WAV file')
    convert_parser.add_argument('-r', '--rate', type=int, default=16000,
                               help='Sample rate in Hz (default: 16000)')
    
    # Batch command
    batch_parser = subparsers.add_parser('batch', help='Convert all files in a directory')
    batch_parser.add_argument('input_dir', help='Input directory')
    batch_parser.add_argument('-o', '--output-dir', help='Output directory')
    batch_parser.add_argument('-r', '--rate', type=int, default=16000,
                             help='Sample rate in Hz (default: 16000)')
    
    # Info command
    info_parser = subparsers.add_parser('info', help='Display audio file information')
    info_parser.add_argument('file', help='Audio file')
    
    args = parser.parse_args()
    
    if args.command == 'convert':
        convert_to_wav(args.input, args.output, args.rate)
    
    elif args.command == 'batch':
        batch_convert(args.input_dir, args.output_dir, args.rate)
    
    elif args.command == 'info':
        get_audio_info(args.file)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
