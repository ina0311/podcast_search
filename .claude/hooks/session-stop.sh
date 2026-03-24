#!/bin/bash
# Stop hook: セッション終了時にgit状態をログに記録

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH=$(git branch --show-current 2>/dev/null || echo 'unknown')
CHANGED=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
LOG_FILE=".claude/session.log"

echo "[$TIMESTAMP] branch=$BRANCH changed_files=$CHANGED" >> "$LOG_FILE"

exit 0
