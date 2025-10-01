#!/bin/bash

if [ ! -f "image.png" ]; then
  echo "Please place image.png in the current directory first"
  exit 1
fi

BASE64_IMAGE=$(base64 -i image.png)

curl -X POST http://127.0.0.1:47923/prompt \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"Please analyze this image and tell me what you see.\",
    \"image\": \"data:image/png;base64,$BASE64_IMAGE\"
  }"