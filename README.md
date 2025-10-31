# Sprint Retro Tool

A peer-to-peer, real-time sprint retrospective tool built with React Native (Expo Web) and WebRTC. No backend required - all data stays in your browser!

## Features

- ✨ **Real-time Collaboration**: WebRTC peer-to-peer connections for instant updates
- 🔒 **Privacy First**: No server storage, data stays in participant browsers
- 🎨 **Canvas-Based**: Free-form drag-and-drop cards on an infinite canvas
- 👍 **Voting System**: Vote on cards to prioritize discussions
- 💾 **Save/Load**: Export and import sessions as JSON files
- 🎯 **Modern UI**: Clean, professional design inspired by Excalidraw
- 🚀 **GitHub Pages**: Deploy as a static site

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start

# Open in web browser
# Press 'w' to open in web browser
```

### Usage

#### Hosting a Session

1. Open the app
2. Enter your name
3. Click "Create New Session"
4. Share the session link with your team
5. Start adding cards and collaborating!

#### Joining a Session

1. Receive session link from host
2. Click the link or enter the session code
3. Enter your name
4. Start collaborating!

### Canvas Controls

- **Pan**: Click and drag on empty space, or use mouse wheel
- **Zoom**: Ctrl/Cmd + Mouse wheel, or use zoom buttons
- **Drag Cards**: Click and drag from the top handle
- **Edit Card**: Click on card content
- **Vote**: Click the 👍 button
- **Change Color**: Click the 🎨 button
- **Delete**: Click the 🗑️ button

### Save and Load

- **Save**: Click "💾 Save" to download session as JSON
- **Load** (Host only): Click "📂 Load" to restore a saved session

## Testing

### Automated Tests

Run the automated build test to verify everything works:

```bash
./scripts/test-build.sh
```

This will:
- ✅ Check TypeScript compilation
- ✅ Build for production
- ✅ Verify output files
- ✅ Show build statistics

### Manual Testing

```bash
# Start dev server
npm start
# Press 'w' for web

# Test features:
# 1. Create a session
# 2. Add/edit/delete cards
# 3. Vote on cards
# 4. Change card colors
# 5. Drag cards around
# 6. Save/load session
```

## Building for Production

### Local Build

```bash
# Build the app
./scripts/build.sh

# Or manually
npm run build:web

# Test locally
npx serve dist
```

### Deploy to GitHub Pages

1. Push to GitHub
2. Enable GitHub Pages in repository settings:
   - Settings → Pages
   - Source: GitHub Actions
3. The GitHub Actions workflow will automatically build and deploy

## Architecture

### P2P Communication

- Built on PeerJS for simplified WebRTC
- Host acts as the "source of truth"
- All peers connect directly to each other
- Real-time state synchronization

### State Management

- Zustand for global state
- Optimistic updates for smooth UX
- Conflict resolution via host authority

### Tech Stack

- **Frontend**: React Native (Expo Web)
- **P2P**: PeerJS (WebRTC)
- **State**: Zustand
- **Drag & Drop**: react-draggable
- **Animations**: framer-motion
- **Routing**: Expo Router

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Landing page
│   └── session/[id].tsx   # Retrospective board
├── components/            # React components
│   ├── Board.tsx          # Canvas board
│   ├── Card.tsx           # Card component
│   └── Toolbar.tsx        # Top toolbar
├── store/                 # State management
│   └── useRetroStore.ts   # Zustand store + P2P logic
├── types/                 # TypeScript types
│   └── index.ts           # Type definitions
├── hooks/                 # Custom React hooks
│   └── useUser.ts         # User name persistence
├── utils/                 # Utilities
│   └── colors.ts          # Color palette
├── scripts/               # Build scripts
│   └── build.sh           # Production build
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions deployment

```

## Configuration

### Expo Configuration

Edit `app.json` to customize:
- App name
- Slug (affects URL)
- Icons and splash screen

### PeerJS Server

By default, uses the free PeerJS cloud server. For production, consider:
- Self-hosting PeerJS server
- Using a custom STUN/TURN server

## Limitations

- **Host Dependency**: Host must stay connected for session stability
- **No Persistence**: Data lost when all peers disconnect (use Save feature)
- **Scale Limit**: Best for 2-20 participants
- **Browser Only**: Web browsers with WebRTC support required

## Troubleshooting

### Connection Issues

- Ensure WebRTC is supported (modern browsers)
- Check firewall/network settings
- Try a different browser

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### TypeScript Errors

```bash
# Regenerate types
npx expo customize tsconfig.json
```

## Future Enhancements

- [ ] Card grouping UI
- [ ] Undo/redo functionality
- [ ] Multiple board layouts
- [ ] Export to PDF/Markdown
- [ ] Timer for activities
- [ ] Company-based authentication
- [ ] Session history
- [ ] Mobile app (iOS/Android)

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for your teams!

## Acknowledgments

- Inspired by Excalidraw's clean, modern UI
- Built with love for agile teams
