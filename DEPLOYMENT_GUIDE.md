# Deployment Guide for Vercel

## Status
✅ All code changes committed locally (commit `b9d59a3`)
⏳ Needs manual push to GitHub and Vercel setup

## Step 1: Push to GitHub

The code is ready and committed, but needs authentication to push:

```bash
cd /home/coder/ai-prompt-refiner/read-down-creative
git push origin main
```

If you need to authenticate, you can:
- Use GitHub CLI: `gh auth login` then push
- Set up SSH keys and change remote to SSH URL
- Use a personal access token

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your repository: `Excellent-Cardigan/read-down-generator`
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

## Step 3: Add Environment Variables in Vercel

In the Vercel project settings, add these environment variables:

### Required for Firefly AI Generation:
```
FIREFLY_API_KEY=<your-bertelsmann-firefly-key>
```

### Required for Nova AI Generation:
```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_REGION=us-east-1
```

### Optional (if using temporary credentials):
```
AWS_SESSION_TOKEN=<your-session-token>
```

## Step 4: Deploy

Click "Deploy" in Vercel. The deployment will:
1. Install dependencies
2. Build the Vite frontend
3. Deploy serverless functions from `/api` directory
4. Provide you with a production URL (e.g., `read-down-generator.vercel.app`)

## What Was Changed

### New Files Created:
- `api/extract-colors.ts` - Color extraction serverless function
- `api/ai-prompts.ts` - AI prompt configuration endpoint
- `api/generate-background.ts` - Firefly/Nova image generation
- `vercel.json` - Vercel deployment configuration
- `.env.example` - Environment variable template

### Files Modified:
- `vite.config.js` - Removed `/read-down-generator/` base path (now deploys to root)
- `src/pages/index.jsx` - Removed Router basename
- `package.json` - Added `@vercel/node` and `multiparty` dependencies

## Vercel Serverless Function Details

All API routes now run as serverless functions:

| Route | Function | Purpose |
|-------|----------|---------|
| `POST /api/extract-colors` | `api/extract-colors.ts` | Extract dominant colors from uploaded images using sharp + k-means |
| `GET /api/ai-prompts` | `api/ai-prompts.ts` | Serve AI prompt configurations |
| `POST /api/generate-background` | `api/generate-background.ts` | Generate AI backgrounds using Firefly or Nova |

## Testing After Deployment

Once deployed, test these features:
1. ✅ Pattern generation (client-side, should work immediately)
2. ✅ Image upload and color extraction (requires working API)
3. ✅ AI background generation (requires API keys configured)

## Rollback Plan

If issues arise, you can roll back to the previous commit:
```bash
git revert HEAD
git push origin main
```

Vercel will automatically redeploy the previous version.

## Local Development

To continue local development with the new structure:
```bash
npm run dev        # Starts both client (Vite) and server (Express) in development mode
npm run dev:client # Client only
npm run build      # Build for production
```

Note: Local dev still uses the Express server (`server/` directory). The `api/` directory is only for Vercel deployment.
