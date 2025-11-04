#!/bin/bash

# Load Testing Script for Universal Claude Router
# Requires autocannon: npm install -g autocannon

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOST="${UCR_HOST:-localhost}"
PORT="${UCR_PORT:-3000}"
BASE_URL="http://${HOST}:${PORT}"

echo -e "${GREEN}Universal Claude Router - Load Testing${NC}"
echo "========================================"
echo "Host: ${HOST}"
echo "Port: ${PORT}"
echo ""

# Check if autocannon is installed
if ! command -v autocannon &> /dev/null; then
    echo -e "${RED}Error: autocannon not found${NC}"
    echo "Install with: npm install -g autocannon"
    exit 1
fi

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server...${NC}"
for i in {1..30}; do
    if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Server did not start in time${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Test 1: Health endpoint baseline
echo -e "${YELLOW}Test 1: Health Endpoint Baseline${NC}"
echo "Testing /health endpoint for baseline performance"
autocannon -c 100 -d 10 "${BASE_URL}/health"
echo ""

# Test 2: Light load on messages endpoint
echo -e "${YELLOW}Test 2: Light Load - Messages Endpoint${NC}"
echo "Testing /v1/messages with 50 concurrent connections"
autocannon -c 50 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"model":"claude-3-sonnet","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}' \
  "${BASE_URL}/v1/messages"
echo ""

# Test 3: Medium load
echo -e "${YELLOW}Test 3: Medium Load${NC}"
echo "Testing with 100 concurrent connections"
autocannon -c 100 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"model":"claude-3-sonnet","messages":[{"role":"user","content":"What is 2+2?"}],"max_tokens":50}' \
  "${BASE_URL}/v1/messages"
echo ""

# Test 4: Heavy load (stress test)
echo -e "${YELLOW}Test 4: Heavy Load (Stress Test)${NC}"
echo "Testing with 200 concurrent connections"
autocannon -c 200 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"model":"claude-3-sonnet","messages":[{"role":"user","content":"Test message"}],"max_tokens":10}' \
  "${BASE_URL}/v1/messages"
echo ""

# Test 5: Metrics endpoint
echo -e "${YELLOW}Test 5: Metrics Endpoint${NC}"
echo "Fetching performance metrics"
curl -s "${BASE_URL}/debug/metrics" | python3 -m json.tool || echo "Metrics endpoint not available"
echo ""

# Test 6: Cache performance test
echo -e "${YELLOW}Test 6: Cache Performance Test${NC}"
echo "Testing cache hit rate with repeated requests"
autocannon -c 50 -d 20 -m POST \
  -H "Content-Type: application/json" \
  -b '{"model":"claude-3-sonnet","messages":[{"role":"user","content":"Cached test"}],"max_tokens":10}' \
  "${BASE_URL}/v1/messages"
echo ""

# Final metrics
echo -e "${GREEN}Load Testing Complete!${NC}"
echo ""
echo "Fetching final metrics..."
curl -s "${BASE_URL}/debug/metrics" | python3 -m json.tool || echo "Metrics endpoint not available"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "- Health endpoint tested for baseline"
echo "- Light load: 50 concurrent connections"
echo "- Medium load: 100 concurrent connections"
echo "- Heavy load: 200 concurrent connections"
echo "- Cache performance tested"
echo ""
echo -e "${YELLOW}Check the output above for detailed performance metrics${NC}"
