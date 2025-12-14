# DigitDuel - Online Multiplayer Code Breaking

A real-time multiplayer number guessing game where players create rooms and play together remotely!

## Features

- 🎮 **Online Multiplayer**: Play with anyone, anywhere
- 🔐 **Room-Based System**: Create or join rooms with 6-digit codes
- 🎯 **Real-time Gameplay**: Instant updates using WebSocket technology
- 🎭 **Personalization**: Choose your name, avatar, and theme color
- 🎨 **Beautiful UI**: Dark theme with 5 color themes and smooth animations
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🏆 **Series Tracking**: Play multiple rounds and track wins

## Game Rules

1. Each player sets a secret 4-digit number (1-9, no repeats, no zeros)
2. Players take turns guessing each other's secret number
3. **Green tile** = Correct digit in correct position
4. **Yellow tile** = Correct digit in wrong position  
5. **Gray tile** = Digit not in secret number
6. First player to guess correctly wins!

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and go to:
```
http://localhost:3000
```

### For Development

Use nodemon for auto-restart on file changes:
```bash
npm run dev
```

## How to Play

1. **Personalize**: Enter your name, choose an avatar (🦊🐻🐼🦁🐯🐨🐸🦄), and pick a theme color
2. **Create a Room**: Click "Create Room" to generate a 6-digit code
3. **Share the Code**: Send the code to your friend
4. **Join the Room**: Your friend enters the code, personalizes their profile, and joins
5. **Set Secrets**: Both players privately set their 4-digit secret numbers
6. **Take Turns**: Alternate guessing until someone wins!
7. **Play Again**: Track your series score and play multiple rounds

## Deployment Options

### Option 1: Heroku

1. Install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new app:
```bash
heroku create your-app-name
```

4. Deploy:
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

5. Open your app:
```bash
heroku open
```

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new "Web Service"
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Click "Create Web Service"

### Option 3: Railway

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js and deploys
5. Get your URL from the deployment

### Option 4: DigitalOcean App Platform

1. Create account at [digitalocean.com](https://www.digitalocean.com)
2. Go to App Platform
3. Connect GitHub repository
4. Configure:
   - Run Command: `npm start`
   - HTTP Port: `3000`
5. Deploy

### Option 5: Self-Hosted (VPS)

On your server:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repository
git clone <your-repo-url>
cd ppa-email

# Install dependencies
npm install

# Install PM2 for process management
sudo npm install -g pm2

# Start the server
pm2 start server.js --name "number-wordle"

# Make it start on boot
pm2 startup
pm2 save

# Configure Nginx (optional but recommended)
sudo apt install nginx
# Configure reverse proxy at /etc/nginx/sites-available/default
```

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

For production, you can set a custom port:

```bash
PORT=8080 npm start
```

Or create a `.env` file:
```
PORT=8080
```

## Personalization Features

### 🎭 Choose Your Identity
- **Custom Names**: Enter any name (up to 12 characters) or use default "Player 1/2"
- **Avatar Selection**: 8 emoji avatars to choose from
  - 🦊 Fox • 🐻 Bear • 🐼 Panda • 🦁 Lion
  - 🐯 Tiger • 🐨 Koala • 🐸 Frog • 🦄 Unicorn

### 🎨 Theme Colors
Choose from 5 vibrant themes that change the entire UI:
- **Green** (Default) - Classic DigitDuel
- **Blue** - Cool Ocean Vibes
- **Purple** - Royal Elegance
- **Pink** - Playful Energy
- **Orange** - Sunset Warmth

All theme colors apply to:
- Brand title gradient
- Buttons and badges
- Correct tile highlights
- Room code displays
- Game over modals

## Tech Stack

- **Backend**: Node.js, Express
- **Real-time**: Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Personalization**: Dynamic theming, avatar system

## File Structure

```
├── server.js          # Backend server with Socket.IO and player info handling
├── game.html          # Frontend game interface with personalization
├── confetti.js        # Celebration effects library
├── package.json       # Dependencies and scripts
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## What's New in Version 2.0

### ✨ Personalization Update
- **Player Profiles**: Set your name and choose from 8 avatars
- **5 Theme Colors**: Customize the entire UI with your favorite color
- **Better Identity**: See names and avatars throughout the game
  - In game boards
  - Turn indicators
  - Win/loss screens
  - Series scores
- **Persistent Themes**: Your theme choice applies instantly to all UI elements

## Troubleshooting

**Players can't connect:**
- Check firewall settings
- Ensure PORT is not blocked
- Verify server is running with `npm start`

**Socket connection issues:**
- Check browser console for errors
- Ensure Socket.IO client version matches server
- Try using HTTP instead of HTTPS in development

**Game state sync issues:**
- Refresh both players' browsers
- Create a new room
- Check server logs for errors

## License

MIT

## Credits

Created with ❤️ for online gaming enthusiasts
