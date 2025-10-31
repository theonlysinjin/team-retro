# Sprint Retrospective Tool - Project Plan

## Overview
A real-time sprint retrospective web application built with React Native (Expo Web), deployed to GitHub Pages with Convex as the backend.

## Core Features

### 1. Session Management
- **Host Session**: Create a new retrospective session
- **Join Session**: Join via encoded URL link
- **Real-time Sync**: All participants see updates instantly via Convex

### 2. Retrospective Board
Three columns:
- **What Went Well** (Positive feedback)
- **What Went Badly** (Areas for improvement)
- **TODO Items** (Action items)

### 3. Card Features
- **Create/Edit Cards**: Users can add and modify cards
- **User Attribution**: Each card shows who created it
- **Grouping**: Drag cards together to group similar items
- **Voting**: +1 voting system on cards
- **Coloring**: Assign colors to cards for visual organization
- **Real-time Updates**: All changes sync instantly

### 4. User Management
- **Name Entry**: Simple name input (no authentication)
- **Future-Ready**: Architecture prepared for company-based auth
- **Session Persistence**: Names stored per session

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo
- **Target**: Web (Expo Web)
- **UI Library**: React Native built-in components + custom styling
- **State Management**: React hooks + Convex real-time subscriptions
- **Routing**: Expo Router or React Navigation

### Backend
- **Platform**: Convex
- **Real-time**: WebSocket connections for instant updates
- **Data Model**:
  - `sessions`: Retrospective sessions
  - `cards`: Individual retro cards
  - `votes`: Vote tracking
  - `groups`: Card groupings
  - `users`: Session participants

### Deployment
- **Hosting**: GitHub Pages
- **Build**: Expo web build
- **CI/CD**: GitHub Actions workflow
- **Local Development**: Expo dev server

## Data Schema

### Sessions
```typescript
{
  _id: Id<"sessions">,
  code: string,              // Encoded join code
  hostName: string,
  createdAt: number,
  status: "active" | "archived"
}
```

### Cards
```typescript
{
  _id: Id<"cards">,
  sessionId: Id<"sessions">,
  column: "well" | "badly" | "todo",
  content: string,
  color: string,
  authorName: string,
  createdAt: number,
  groupId?: Id<"groups">
}
```

### Votes
```typescript
{
  _id: Id<"votes">,
  cardId: Id<"cards">,
  userName: string,
  createdAt: number
}
```

### Groups
```typescript
{
  _id: Id<"groups">,
  sessionId: Id<"sessions">,
  name?: string,
  color?: string
}
```

## User Flows

### 1. Host Flow
1. Land on homepage
2. Enter name
3. Click "Create Session"
4. Receive shareable link
5. Share link with team
6. Facilitate retrospective

### 2. Participant Flow
1. Click shared link
2. Enter name
3. Join session
4. Add cards, vote, collaborate

### 3. Card Interaction
1. Click "Add Card"
2. Type content
3. Choose color
4. Submit → appears for all users
5. Others can vote (+1)
6. Drag to group cards

## Future Considerations

### Authentication (Phase 2)
- Company-based authentication
- OAuth integration (Google, Microsoft)
- Role-based permissions (host, participant)
- Session ownership and management

### Additional Features (Phase 2+)
- Export retrospective as PDF/Markdown
- Timer for time-boxed activities
- Anonymous mode for cards
- Card reactions beyond +1
- Historical retrospectives view
- Analytics and insights

## File Structure
```
/
├── app/                    # Expo Router pages
│   ├── index.tsx          # Landing page
│   ├── create.tsx         # Create session
│   ├── join/[code].tsx    # Join session
│   └── session/[id].tsx   # Retrospective board
├── components/
│   ├── Card.tsx           # Retro card component
│   ├── Column.tsx         # Board column
│   ├── Board.tsx          # Full board
│   ├── VoteButton.tsx     # Voting UI
│   └── CardGroup.tsx      # Grouped cards
├── convex/
│   ├── schema.ts          # Data schema
│   ├── sessions.ts        # Session mutations/queries
│   ├── cards.ts           # Card mutations/queries
│   ├── votes.ts           # Vote mutations/queries
│   └── groups.ts          # Group mutations/queries
├── hooks/
│   ├── useSession.ts      # Session management
│   └── useUser.ts         # User state
├── utils/
│   ├── sessionCode.ts     # Encode/decode logic
│   └── colors.ts          # Color palette
├── package.json
├── app.json               # Expo config
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml     # GHA deployment
└── scripts/
    └── build.sh           # Local build script
```

## Development Phases

### Phase 1: Foundation (Current)
- ✅ Project setup
- ✅ Convex configuration
- ✅ Basic routing

### Phase 2: Core Features
- Session creation/joining
- Basic board with three columns
- Card CRUD operations
- Real-time synchronization

### Phase 3: Advanced Features
- Card grouping
- Voting system
- Card coloring
- User names display

### Phase 4: Polish
- UI/UX refinement
- Responsive design
- Error handling
- Loading states

### Phase 5: Deployment
- Build script
- GitHub Actions workflow
- GitHub Pages deployment
- Testing and verification

## Success Criteria
- ✅ Users can create and join sessions
- ✅ Real-time updates work smoothly
- ✅ All card features functional
- ✅ Clean, intuitive UI
- ✅ Successful deployment to GitHub Pages
- ✅ Local build script works
- ✅ CI/CD pipeline functional
