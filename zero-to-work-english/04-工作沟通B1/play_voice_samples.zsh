#!/usr/bin/env zsh

setopt null_glob

script_directory=${0:A:h}
audio_directory="$script_directory/audio/american-voice-samples"
repeat_count=10
play_once=false
dry_run=false
player_pid=""
is_paused=false
skip_current=false

print_usage() {
  cat <<'EOF'
Usage: ./play_voice_samples.zsh [options]

Play every MP3 in audio/american-voice-samples in filename order.
Each file is repeated 10 times by default, and the full playlist loops forever.

Options:
  --once            Play the full playlist once, then exit.
  --repeat NUMBER   Repeat each MP3 NUMBER times.
  --dry-run         Print the playback order without playing audio.
  -h, --help        Show this help message.

Stop playback at any time: press Ctrl+C in this terminal.

Playback controls:
  P                 Pause or resume the current audio.
  N                 Skip the current repetition.
  Q                 Stop playback and exit.
EOF
}

stop_playback() {
  local exit_code=${1:-130}
  print "\nStopping playback..."
  if [[ -n "$player_pid" ]]; then
    kill "$player_pid" 2>/dev/null
    wait "$player_pid" 2>/dev/null
  fi
  exit "$exit_code"
}

trap stop_playback INT TERM

play_audio() {
  local audio_file=$1
  local key=""

  is_paused=false
  skip_current=false
  /usr/bin/afplay "$audio_file" &
  player_pid=$!

  while kill -0 "$player_pid" 2>/dev/null; do
    if read -k 1 -t 0.2 key 2>/dev/null; then
      case "${key:l}" in
        p)
          if [[ "$is_paused" == true ]]; then
            kill -CONT "$player_pid" 2>/dev/null
            is_paused=false
            print "\nResumed: ${audio_file:t}"
          else
            kill -STOP "$player_pid" 2>/dev/null
            is_paused=true
            print "\nPaused: ${audio_file:t} (press P to resume)"
          fi
          ;;
        n)
          skip_current=true
          kill "$player_pid" 2>/dev/null
          print "\nSkipped: ${audio_file:t}"
          ;;
        q)
          stop_playback 0
          ;;
      esac
    fi
  done

  wait "$player_pid" 2>/dev/null
  player_pid=""
  is_paused=false
}

while (( $# > 0 )); do
  case "$1" in
    --once)
      play_once=true
      shift
      ;;
    --repeat)
      if (( $# < 2 )) || [[ ! "$2" =~ '^[1-9][0-9]*$' ]]; then
        print -u2 "Error: --repeat requires a positive integer."
        exit 2
      fi
      repeat_count=$2
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      print -u2 "Error: unknown option: $1"
      print_usage >&2
      exit 2
      ;;
  esac
done

audio_files=("$audio_directory"/*.mp3(N))
if (( ${#audio_files} == 0 )); then
  print -u2 "Error: no MP3 files found in $audio_directory"
  exit 1
fi

cycle=1
print "Controls: P = pause/resume, N = skip, Q or Ctrl+C = stop"
while true; do
  print "\nPlaylist cycle $cycle"

  for audio_file in "${audio_files[@]}"; do
    for repetition in {1..$repeat_count}; do
      print "[$repetition/$repeat_count] ${audio_file:t}"

      if [[ "$dry_run" == true ]]; then
        continue
      fi

      play_audio "$audio_file"
    done
  done

  if [[ "$play_once" == true || "$dry_run" == true ]]; then
    break
  fi

  (( cycle++ ))
done

print "\nPlayback complete."