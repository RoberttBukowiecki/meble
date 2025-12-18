#!/bin/bash

# Simple script to trigger the blog image generation pipeline
# Usage: ./trigger-image-gen.sh [optional-api-key]

PORT=3003 # Default port for landing app
API_URL="http://localhost:$PORT/api/cron/generate-blog-images"

echo "🍌 Triggering Blog Image Pipeline..."

# Ask for limit
read -p "How many images to generate? (default: 1, enter 'all' for everything): " LIMIT_INPUT
LIMIT_INPUT=${LIMIT_INPUT:-1}

# Ask for force
read -p "Force regenerate existing images? (y/N): " FORCE_INPUT
FORCE="false"
if [[ "$FORCE_INPUT" =~ ^[Yy]$ ]]; then
    FORCE="true"
fi

echo "Target URL: $API_URL"
echo "Limit: $LIMIT_INPUT"
echo "Force: $FORCE"

# Check if server is running (simple check)
if ! curl --output /dev/null --silent --head --fail "http://localhost:$PORT"; then
    echo "❌ Error: Landing app (port $PORT) does not seem to be running."
    echo "👉 Please run 'pnpm dev' in a separate terminal first."
    exit 1
fi

# Execute request
# Pass limit and force parameters
RESPONSE=$(curl -s -X GET "$API_URL?force=$FORCE&limit=$LIMIT_INPUT")

echo "✅ Response received:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo "Done."
