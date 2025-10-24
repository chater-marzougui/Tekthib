#!/bin/bash

# Tekthib WebRTC Testing Quick Start Script
# This script helps you quickly start testing WebRTC voice chat

set -e

echo "🎤 Tekthib WebRTC Testing Quick Start"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if ! command_exists node; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js v18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"

# Check npm
if ! command_exists npm; then
    echo -e "${YELLOW}⚠️  npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm found: $(npm --version)"
echo ""

# Menu
echo "Select a testing method:"
echo "1) Browser Multi-Tab Test (Recommended - Real Audio)"
echo "2) Node.js Connectivity Test (WebSocket only)"
echo "3) Start Test Signaling Server"
echo "4) Run Full Setup (Install dependencies + Start server)"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🌐 Starting Browser Multi-Tab Test...${NC}"
        echo ""
        echo "Steps:"
        echo "1. Make sure the Tekthib server is running on port 3001"
        echo "   (If not, run: cd server && npm run dev)"
        echo ""
        echo "2. Opening browser-test.html in your default browser..."
        echo ""
        
        # Check if server is running
        if ! nc -z localhost 3001 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Warning: Server not detected on port 3001${NC}"
            echo "Starting server..."
            cd ../server
            npm run dev > /tmp/tekthib-server.log 2>&1 &
            SERVER_PID=$!
            echo "Server started with PID: $SERVER_PID"
            echo "Waiting for server to start..."
            sleep 3
            cd ../test
        else
            echo -e "${GREEN}✓${NC} Server is running on port 3001"
        fi
        
        # Open browser
        if command_exists xdg-open; then
            xdg-open browser-test.html
        elif command_exists open; then
            open browser-test.html
        elif command_exists start; then
            start browser-test.html
        else
            echo "Please manually open: $(pwd)/browser-test.html"
        fi
        
        echo ""
        echo -e "${GREEN}✓${NC} Browser test page should be open"
        echo ""
        echo "Next steps in browser:"
        echo "1. Click 'Start Multi-Tab Test'"
        echo "2. Allow popups when prompted"
        echo "3. Allow microphone access in each tab"
        echo "4. Monitor the logs and statistics"
        echo ""
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}🔌 Running Node.js Connectivity Test...${NC}"
        echo ""
        
        # Install dependencies if needed
        if [ ! -d "node/node_modules" ]; then
            echo "Installing dependencies..."
            cd node
            npm install
            cd ..
        fi
        
        # Check if server is running
        if ! nc -z localhost 3001 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Warning: Server not detected on port 3001${NC}"
            echo "Starting server..."
            cd ../server
            npm run dev > /tmp/tekthib-server.log 2>&1 &
            SERVER_PID=$!
            echo "Server started with PID: $SERVER_PID"
            echo "Waiting for server to start..."
            sleep 3
            cd ../test
        fi
        
        echo "Running test with 2 clients..."
        cd node
        SIGNALING_URL=ws://localhost:3001 NUM_CLIENTS=2 npx tsx testConnection.ts
        cd ..
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}🔌 Starting Test Signaling Server...${NC}"
        echo ""
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        echo "Starting test signaling server on port 3001..."
        npm run signaling-server
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}📦 Running Full Setup...${NC}"
        echo ""
        
        # Install root dependencies
        echo "Installing root dependencies..."
        cd ..
        npm install
        
        # Install server dependencies
        echo "Installing server dependencies..."
        cd server
        npm install
        npm run build
        
        # Install test dependencies
        echo "Installing test dependencies..."
        cd ../test
        npm install
        cd node
        npm install
        cd ..
        
        echo ""
        echo -e "${GREEN}✓${NC} Setup complete!"
        echo ""
        echo "Starting Tekthib server..."
        cd ../server
        npm run dev > /tmp/tekthib-server.log 2>&1 &
        SERVER_PID=$!
        echo "Server started with PID: $SERVER_PID"
        echo "Logs: /tmp/tekthib-server.log"
        echo ""
        echo "Waiting for server to start..."
        sleep 5
        
        cd ../test
        echo ""
        echo -e "${GREEN}✓${NC} Server is running!"
        echo ""
        echo "Now run this script again and choose option 1 or 2 to test."
        ;;
        
    5)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo -e "${YELLOW}Invalid choice. Exiting...${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓${NC} Done!"
echo ""
echo "For more information, see TESTING_GUIDE.md"
