#!/bin/bash

curl -X POST http://127.0.0.1:47923/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello Claude, generate a random number between 1 and 100"
  }'