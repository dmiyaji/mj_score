#!/bin/sh
PROJECT_DIR="/usr/src/app"

# 以下はproject作成後は消していい
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  TMP_DIR=$(mktemp -d -t tmp-nextjs-XXXXXX | tr '[:upper:]' '[:lower:]')
  npx create-next-app@latest $TMP_DIR --use-npm --ts --eslint --src-dir
  mv $TMP_DIR/* $PROJECT_DIR
  mv $TMP_DIR/.[^.]* $PROJECT_DIR
  rm -rf $TMP_DIR
fi

echo "Starting Next.js development server..."
npm run dev