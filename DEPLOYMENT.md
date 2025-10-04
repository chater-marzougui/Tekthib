# Deployment Guide

## Overview

This document describes the deployment setup for the Tekthib application:
- **Frontend**: Deployed to GitHub Pages at `https://chater-marzougui.me/Tekthib/`
- **Backend**: Deployed to Heroku at `https://takthib-a00f145250bc.herokuapp.com`

## Frontend Deployment (GitHub Pages)

### Automatic Deployment

The frontend is automatically deployed to GitHub Pages when changes are pushed to the `main` branch that affect:
- `client/**` files
- `shared/**` files
- `.github/workflows/deploy.yml`

The deployment workflow is defined in `.github/workflows/deploy.yml`.

### Configuration

#### Vite Configuration (`client/vite.config.ts`)
```typescript
export default defineConfig({
  base: "/Tekthib/",  // Important: Must match GitHub Pages path
  // ... other config
});
```

#### React Router Configuration (`client/src/App.tsx`)
```typescript
<Router basename="/Tekthib">  // Must match Vite base path
  {/* routes */}
</Router>
```

#### Environment Variables
During build, the following environment variables are set in the workflow:
- `VITE_API_URL`: `https://takthib-a00f145250bc.herokuapp.com`
- `VITE_WS_URL`: `wss://takthib-a00f145250bc.herokuapp.com`

### SPA Routing on GitHub Pages

GitHub Pages doesn't natively support client-side routing. We use the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) solution:

1. **404.html**: Redirects all 404 requests to the main page with the original path encoded in the query string
2. **index.html script**: Decodes the query string and uses `history.replaceState()` to restore the correct URL

This ensures direct URLs like `https://chater-marzougui.me/Tekthib/room/ABC123` work correctly.

### Manual Deployment

To deploy manually:

```bash
cd client
npm install
npm run build
# The build output is in client/dist/

# Deploy using gh-pages (if configured)
npm run deploy
```

Or trigger the workflow manually:
1. Go to Actions tab on GitHub
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

## Backend Deployment (Heroku)

### Current Setup

The backend is deployed to Heroku. The server code is in the `server/` directory.

### Configuration

The backend should be configured with:
- `PORT`: Automatically set by Heroku
- `NODE_ENV`: Set to `production`
- `ADMIN_PASSWORD`: Set via Heroku config vars

### CORS Configuration

The backend is configured to allow requests from the frontend:
```typescript
app.use(
  cors({
    origin: '*',  // Or restrict to specific origins in production
    credentials: true,
  }),
);
```

### Deployment Commands

```bash
# Login to Heroku
heroku login

# Deploy to Heroku (if git remote is set up)
git push heroku main

# View logs
heroku logs --tail

# Set environment variables
heroku config:set ADMIN_PASSWORD=your_password
```

## Troubleshooting

### White Screen Issue

**Symptom**: Blank white screen when accessing the app on GitHub Pages

**Causes**:
1. React Router `basename` doesn't match Vite `base` path
2. Missing 404.html for SPA routing
3. JavaScript errors preventing app from loading

**Solution**: Ensure `basename="/Tekthib"` is set in `App.tsx` and matches the Vite config.

### 404 Errors on Subroutes

**Symptom**: Direct navigation to routes like `/Tekthib/room/ABC` returns 404

**Solution**: Ensure `404.html` is present in `client/public/` and the redirect script is in `index.html`.

### WebSocket Connection Issues

**Symptom**: Cannot connect to backend, real-time features don't work

**Causes**:
1. Backend is not running or is down
2. WebSocket URL is incorrect
3. CORS is blocking the connection

**Solution**: 
1. Check backend is running: `curl https://takthib-a00f145250bc.herokuapp.com/api/health`
2. Verify WebSocket URL is using `wss://` (not `ws://`) for production
3. Check CORS configuration in backend

### Assets Not Loading

**Symptom**: CSS, JS, or images not loading

**Cause**: Incorrect base path configuration

**Solution**: Ensure Vite `base` is set to `/Tekthib/` and all assets use relative paths.

## Development vs Production

### Development
```bash
# Frontend
cd client
npm run dev
# Runs on http://localhost:5173

# Backend
cd server
npm run dev
# Runs on http://localhost:3001

# Environment files
# client/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Production
- Frontend: `https://chater-marzougui.me/Tekthib/`
- Backend: `https://takthib-a00f145250bc.herokuapp.com`
- Environment variables are set in GitHub Actions workflow

## Monitoring

### Frontend
- Check GitHub Actions for deployment status
- Access the site: `https://chater-marzougui.me/Tekthib/`

### Backend
- Check Heroku dashboard for dyno status
- Health check endpoint: `https://takthib-a00f145250bc.herokuapp.com/api/health`
- View logs: `heroku logs --tail -a takthib-a00f145250bc`

## Additional Notes

### GitHub Pages Limitations
- Only static files (HTML, CSS, JS)
- No server-side rendering
- No API endpoints (must use external backend)
- Custom domain supported (currently using `chater-marzougui.me`)

### Heroku Considerations
- Free/Hobby dynos sleep after 30 minutes of inactivity
- Consider upgrading for production use
- WebSocket connections work on all dyno types
- Use environment variables for sensitive configuration
