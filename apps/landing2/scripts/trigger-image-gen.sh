#!/bin/bash

# Script to trigger SEO image generation pipeline
# Supports: blog articles, pillar pages, or all
#
# Usage: ./trigger-image-gen.sh
#
# API Parameters:
#   type=all|blog|pillar  - Which pages to process (default: all)
#   limit=N|all           - How many images (default: 1)
#   force=true|false      - Regenerate existing (default: false)

PORT=3003 # Default port for landing app
API_URL="http://localhost:$PORT/api/cron/generate-blog-images"

echo "🖼️  SEO Image Generation Pipeline"
echo "=================================="

# Ask for type
echo ""
echo "Page types:"
echo "  1) all    - Blog articles + Pillar pages"
echo "  2) blog   - Blog articles only"
echo "  3) pillar - Pillar pages only"
read -p "Select type [1/2/3] (default: 1): " TYPE_INPUT

case "$TYPE_INPUT" in
    2) TYPE="blog" ;;
    3) TYPE="pillar" ;;
    *) TYPE="all" ;;
esac

# Ask for limit
read -p "How many images to generate? (default: 1, enter 'all' for everything): " LIMIT_INPUT
LIMIT_INPUT=${LIMIT_INPUT:-1}

# Ask for force
read -p "Force regenerate existing images? (y/N): " FORCE_INPUT
FORCE="false"
if [[ "$FORCE_INPUT" =~ ^[Yy]$ ]]; then
    FORCE="true"
fi

echo ""
echo "Configuration:"
echo "  Type:  $TYPE"
echo "  Limit: $LIMIT_INPUT"
echo "  Force: $FORCE"
echo "  URL:   $API_URL"
echo ""

# Check if server is running (simple check)
if ! curl --output /dev/null --silent --head --fail "http://localhost:$PORT"; then
    echo "❌ Error: Landing app (port $PORT) does not seem to be running."
    echo "👉 Please run 'pnpm dev' in a separate terminal first."
    exit 1
fi

# Execute request
echo "🚀 Sending request..."
RESPONSE=$(curl -s -X GET "$API_URL?type=$TYPE&force=$FORCE&limit=$LIMIT_INPUT")

echo ""
echo "✅ Response received:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "Done. Images saved to:"
echo "  Blog:   public/img/blog/"
echo "  Pillar: public/img/pillar/"
