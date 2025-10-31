# Deployment Guide

## Prerequisites

1. A GitHub account
2. Git installed locally
3. Node.js 18+ installed

## Initial Setup

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Sprint Retro Tool with P2P architecture"
```

### 2. Create GitHub Repository

1. Go to GitHub and create a new repository
2. Name it something like `sprint-retro-tool`
3. Don't initialize with README (we already have files)
4. Copy the repository URL

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Enable GitHub Pages

### 1. Configure Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the settings

### 2. Automatic Deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:
- Trigger on every push to `main`
- Install dependencies
- Build the Expo web app
- Deploy to GitHub Pages

### 3. Access Your App

After the first successful deployment (check Actions tab), your app will be available at:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Local Testing

### Run Development Server

```bash
npm start
# Press 'w' to open in web browser
```

### Build Locally

```bash
# Using the script
./scripts/build.sh

# Or manually
npm run build:web

# Test the built version
npx serve dist
```

## Troubleshooting

### Build Fails on GitHub Actions

**Problem**: Dependencies installation fails

**Solution**:
```bash
# Locally, try:
npm ci --legacy-peer-deps
```

**Problem**: Build errors

**Solution**: Check the Actions tab for detailed logs. Common issues:
- TypeScript errors (run `npx tsc --noEmit` locally)
- Missing dependencies (run `npm install --legacy-peer-deps`)

### App Not Loading

**Problem**: 404 or blank page

**Solution**:
1. Check if GitHub Pages is enabled
2. Verify the deployment succeeded in Actions tab
3. Check browser console for errors
4. Ensure base path is configured correctly

### WebRTC Connection Issues

**Problem**: Peers can't connect

**Solution**:
1. Check browser console for errors
2. Ensure both users are on modern browsers with WebRTC support
3. Check firewall/network settings
4. Try a different browser

## Custom Domain (Optional)

1. Purchase a domain
2. In GitHub repository settings → Pages:
   - Enter your custom domain
   - Save
3. Configure DNS with your domain provider:
   - Add a CNAME record pointing to: `YOUR_USERNAME.github.io`
4. Wait for DNS propagation (can take up to 48 hours)

## Environment Variables

The app doesn't require environment variables for basic functionality. PeerJS uses the free cloud signaling server.

For production with custom PeerJS server:

1. Set up your own PeerJS server
2. Modify `store/useRetroStore.ts`:
   ```typescript
   const peer = new Peer(sessionId, {
     host: 'your-peerjs-server.com',
     port: 443,
     path: '/peerjs',
     secure: true,
   });
   ```

## Updating the App

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main

# GitHub Actions will automatically rebuild and redeploy
```

## Monitoring

- **GitHub Actions**: Check build/deploy status
- **Browser Console**: Check for runtime errors
- **Network Tab**: Monitor WebRTC connections

## Security Considerations

### Current Implementation
- ✅ No backend = No server-side vulnerabilities
- ✅ WebRTC encrypted (DTLS)
- ✅ No data persistence
- ⚠️ No authentication = Anyone with link can join

### Recommendations for Production
1. Add authentication (OAuth)
2. Implement session passwords
3. Add rate limiting for session creation
4. Monitor PeerJS server usage
5. Consider self-hosting PeerJS server

## Performance Optimization

### For Large Teams (>10 people)

Consider these optimizations:

1. **Reduce Update Frequency**
   - Debounce card position updates
   - Batch multiple changes

2. **Virtual Rendering**
   - Only render visible cards
   - Implement viewport culling

3. **Compression**
   - Compress P2P messages
   - Use protocol buffers instead of JSON

### For Many Cards (>100)

1. **Pagination**: Group cards by category
2. **Lazy Loading**: Load cards on demand
3. **Optimize Re-renders**: Use React.memo extensively

## Backup and Recovery

### Saving Sessions

Users should regularly save their sessions:
1. Host clicks **💾 Save**
2. Downloads JSON file
3. Stores securely

### Restoring Sessions

Host can restore a saved session:
1. Create new session
2. Click **📂 Load**
3. Select JSON file
4. All cards/votes/groups restored

## Analytics (Optional)

To add analytics:

1. Add Google Analytics or similar
2. Update `app/_layout.tsx`:
   ```typescript
   // Add analytics initialization
   ```
3. Track events:
   - Session created
   - Session joined
   - Cards added
   - Votes cast

## Support

For issues or questions:
1. Check browser console for errors
2. Review GitHub Issues
3. Check documentation in README.md
4. Verify WebRTC browser compatibility

## License

MIT License - See LICENSE file for details
