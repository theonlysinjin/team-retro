# Technical Architecture - P2P Sprint Retro Tool

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                  GitHub Pages                         │
│              (Static Web Hosting)                     │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ HTTPS
                   │
┌──────────────────▼───────────────────────────────────┐
│           React Native Web App                        │
│                 (Expo Web)                            │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Routing    │  │   UI Layer   │                 │
│  │ (Expo Router)│  │  (Canvas)    │                 │
│  └──────────────┘  └──────────────┘                 │
│                                                       │
│  ┌───────────────────────────────────┐              │
│  │    State Management (Zustand)     │              │
│  │  • Cards, Votes, Groups           │              │
│  │  • P2P Connections                │              │
│  │  • User Info                      │              │
│  └───────────────────────────────────┘              │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ WebRTC (Peer-to-Peer)
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────▼────┐         ┌─────▼────┐
    │  Host   │◄───────►│  Peer 1  │
    │(Master) │         └──────────┘
    └────┬────┘
         │
         │
    ┌────▼────┐
    │  Peer 2 │
    └─────────┘

    All peers connect to each other
    Host acts as source of truth
```

## P2P Architecture

### No Backend Required
- **Zero external dependencies**: All data stays in the browser
- **Privacy-first**: Sensitive retro data never leaves the peer network
- **GitHub Pages compatible**: Pure static deployment

### WebRTC Communication
- **PeerJS**: Simplified WebRTC peer-to-peer connections
- **Direct connections**: All peers connect directly to each other
- **Host as master**: The host (session creator) maintains authoritative state
- **Real-time sync**: Changes propagate instantly via data channels

### Connection Flow

```
1. Host creates session
   └─> Generates unique session ID
   └─> Initializes PeerJS connection
   └─> Gets shareable link

2. Peer joins via link
   └─> Extracts session ID from URL
   └─> Connects to host via PeerJS
   └─> Receives current state from host
   └─> Connects to other peers

3. State synchronization
   └─> User makes change (add card, vote, etc.)
   └─> Change sent to all connected peers
   └─> Host reconciles conflicts if any
   └─> All peers update their local state
```

## Data Model

### State Structure (Zustand)

```typescript
interface RetroState {
  // Session info
  sessionId: string;
  hostPeerId: string;
  isHost: boolean;
  userName: string;

  // Connected peers
  peers: Map<string, {
    id: string;
    name: string;
    connection: DataConnection;
  }>;

  // Retro data
  cards: Map<string, Card>;
  votes: Map<string, Vote[]>;
  groups: Map<string, Group>;

  // Actions
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  addVote: (cardId: string, userName: string) => void;
  removeVote: (cardId: string, userName: string) => void;
  // ... more actions
}
```

### Card Structure

```typescript
interface Card {
  id: string;
  content: string;
  color: string;
  authorName: string;
  position: { x: number; y: number };
  createdAt: number;
  groupId?: string;
  category: "well" | "badly" | "todo" | null; // Optional categorization
}
```

### Vote Structure

```typescript
interface Vote {
  id: string;
  cardId: string;
  userName: string;
  createdAt: number;
}
```

### Group Structure

```typescript
interface Group {
  id: string;
  name?: string;
  color?: string;
  cardIds: string[];
  position: { x: number; y: number };
}
```

## Canvas-Based UI

### Infinite Canvas
- **Free-form positioning**: Cards can be placed anywhere
- **Zoom and pan**: Navigate large retrospectives easily
- **Smooth interactions**: 60fps drag and drop
- **Modern aesthetic**: Clean, professional design inspired by Excalidraw

### Drag and Drop
- **react-draggable**: Smooth card dragging
- **framer-motion**: Fluid animations for card interactions
- **Position persistence**: Card positions saved in state
- **Collision detection**: Visual feedback when grouping cards

### Visual Design
- **Modern cards**: Subtle shadows, rounded corners, smooth colors
- **Color palette**: Professional, not comic-y
- **Typography**: Clean sans-serif fonts
- **Micro-interactions**: Hover effects, smooth transitions
- **Responsive**: Works on various screen sizes

## State Synchronization

### Message Protocol

```typescript
type P2PMessage =
  | { type: "STATE_SYNC"; data: RetroState }
  | { type: "CARD_ADD"; card: Card }
  | { type: "CARD_UPDATE"; id: string; updates: Partial<Card> }
  | { type: "CARD_DELETE"; id: string }
  | { type: "VOTE_ADD"; cardId: string; userName: string }
  | { type: "VOTE_REMOVE"; cardId: string; userName: string }
  | { type: "GROUP_CREATE"; group: Group }
  | { type: "GROUP_UPDATE"; id: string; updates: Partial<Group> }
  | { type: "PEER_JOIN"; userName: string; peerId: string };
```

### Conflict Resolution
- **Host authority**: Host's state is source of truth
- **Timestamp-based**: Newer changes override older ones
- **Optimistic updates**: UI updates immediately, syncs in background
- **Reconnection handling**: Peers request full state sync on reconnect

## Save/Load Functionality

### Save State
```typescript
function saveState(state: RetroState): void {
  const json = JSON.stringify({
    cards: Array.from(state.cards.values()),
    votes: Array.from(state.votes.entries()),
    groups: Array.from(state.groups.values()),
    sessionId: state.sessionId,
    savedAt: Date.now(),
  }, null, 2);

  // Download as JSON file
  downloadFile(`retro-${state.sessionId}.json`, json);
}
```

### Load State
```typescript
function loadState(jsonString: string): void {
  const data = JSON.parse(jsonString);

  // Restore cards, votes, groups
  // Host broadcasts new state to all peers
  // Peers update their local state
}
```

## Security Considerations

### Privacy
- **No server storage**: Data only exists in peer browsers
- **Encrypted connections**: WebRTC uses DTLS encryption
- **Temporary sessions**: Data cleared when session ends
- **Local save files**: Users control their own data

### Limitations
- **Trust-based**: No authentication, participants must trust each other
- **Host dependency**: If host disconnects, session may become unstable
- **Network requirements**: All peers need good internet connection

### Future Authentication Plan
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  avatar?: string;
  role: "host" | "facilitator" | "participant";
}

// OAuth integration ready
// Company-based access control
// Session ownership verification
```

## Performance Considerations

### Optimization Strategies
1. **Virtual canvas**: Only render visible cards
2. **Debounced updates**: Batch rapid changes
3. **Lazy connections**: Connect to peers on-demand
4. **State compression**: Minimize message sizes
5. **Efficient rendering**: React.memo for card components

### Scalability Limits
- **Recommended**: Up to 10 participants
- **Maximum**: ~20 participants (WebRTC connection limits)
- **Cards**: Up to 500 cards per session (performance dependent)

## Deployment

### Build Process
```bash
# Build for web
npm run build:web

# Output: dist/ directory
# Contains static HTML/CSS/JS
```

### GitHub Actions
```yaml
- Build: expo export --platform web
- Deploy: dist/ → gh-pages branch
- Base path: /<repo-name>/
```

### Configuration
- **No environment variables needed** for basic functionality
- **PeerJS cloud server** (free) or self-hosted signaling server
- **GitHub Pages settings**: Deploy from gh-pages branch

## Browser Compatibility

### Requirements
- **Modern browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **WebRTC support**: Required for P2P connections
- **LocalStorage**: For user name persistence
- **ES6+**: Modern JavaScript features

### Progressive Enhancement
- **Fallback messaging**: If WebRTC unavailable
- **Save/load always works**: Even if P2P fails
- **Graceful degradation**: Core features work on older browsers

## Known Limitations

1. **Host dependency**: Host must stay connected for session stability
2. **No persistence**: Data lost when all peers disconnect
3. **Network sensitivity**: Poor connections affect all peers
4. **Scale limits**: Not suitable for very large teams (>20 people)
5. **No history**: No built-in undo/redo (can be added later)

## Future Enhancements

### Phase 2 Features
- **Persistent rooms**: Optional backend for long-term storage
- **Session history**: Archive completed retros
- **Templates**: Pre-configured board layouts
- **Export formats**: PDF, Markdown, CSV
- **Mobile optimization**: Touch-friendly interactions

### Phase 3 Features
- **Voice chat**: Integrated WebRTC audio
- **Video tiles**: See team members
- **AI insights**: Analyze retro themes
- **Integrations**: Jira, Slack, etc.
