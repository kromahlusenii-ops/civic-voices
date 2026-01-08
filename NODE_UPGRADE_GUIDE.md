# Node.js Upgrade Guide

## Issue
You're running Node.js v14.21.3, but this project requires Node.js 18+.

**Error:** `Unexpected token '??='` - This operator requires Node.js 15+

## Solution: Upgrade Node.js using nvm

Since you have nvm installed, follow these steps:

### 1. Install Node.js 18 LTS (Recommended)

```bash
nvm install 18
nvm use 18
nvm alias default 18
```

### 2. Verify Installation

```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show npm version
```

### 3. Reinstall Dependencies (Optional but Recommended)

After upgrading Node.js, you may want to reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 4. Run Prisma Generate

Now try running Prisma again:

```bash
npx prisma generate
```

## Alternative: Install Latest LTS

If you want the latest LTS version:

```bash
nvm install --lts
nvm use --lts
nvm alias default node
```

## Why Node.js 18+?

- **Next.js 14** requires Node.js 18.17 or higher
- **Prisma 5.x** requires Node.js 16.13.0 or higher
- **Modern JavaScript features** like `??=` require Node.js 15+

## Troubleshooting

### If nvm command not found
Add to your `~/.zshrc`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then reload:
```bash
source ~/.zshrc
```

### If you need to keep Node 14 for other projects
You can switch between versions:
```bash
nvm use 14  # For old projects
nvm use 18  # For this project
```

Or use `.nvmrc` file (see below).

## Using .nvmrc (Recommended)

Create a `.nvmrc` file in your project root:

```bash
echo "18" > .nvmrc
```

Then nvm will automatically use Node 18 when you `cd` into this directory:
```bash
nvm use  # Automatically uses version from .nvmrc
```

---

**After upgrading, continue with Phase 1 setup:**
1. ✅ Upgrade Node.js (this guide)
2. Install Supabase dependencies: `npm install @supabase/supabase-js @supabase/ssr`
3. Run Prisma migration: `npx prisma generate && npx prisma migrate dev --name add_supabase_support`
