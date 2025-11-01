# Git History Cleanup - Remove API Keys

## ⚠️ WARNING

**This process rewrites git history and requires force-pushing**
- Collaborators will need to re-clone the repository
- All forks and branches will be out of sync
- Backup your repository before proceeding

**ONLY do this if**:
- You accidentally committed API keys
- You want to remove sensitive data from history
- You're willing to rewrite public repository history

---

## Option 1: Using BFG Repo-Cleaner (Recommended)

### Step 1: Install BFG

**Windows**:
```bash
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
# Or use Chocolatey:
choco install bfg-repo-cleaner
```

**Mac/Linux**:
```bash
brew install bfg
```

### Step 2: Create Fresh Clone

```bash
cd /path/to/parent/directory
git clone --mirror https://github.com/YOUR_USERNAME/baratie.git
cd baratie.git
```

### Step 3: Remove Files with API Keys

```bash
# Remove app/config.js from all commits
bfg --delete-files config.js

# Remove app/config.prod.js from all commits (old version had keys)
bfg --delete-files config.prod.js
```

### Step 4: Clean and Push

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive

git push --force
```

### Step 5: Update Local Repository

```bash
cd /path/to/your/working/directory/baratie
git fetch origin
git reset --hard origin/main
```

---

## Option 2: Using git filter-branch

### Step 1: Backup Repository

```bash
# Create backup branch
git branch backup-before-cleanup
git push origin backup-before-cleanup
```

### Step 2: Remove Files

```bash
# Remove app/config.js
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch app/config.js" \
  --prune-empty --tag-name-filter cat -- --all

# Remove app/config.prod.js
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch app/config.prod.js" \
  --prune-empty --tag-name-filter cat -- --all
```

### Step 3: Clean References

```bash
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 4: Force Push

```bash
git push origin --force --all
git push origin --force --tags
```

---

## Option 3: Using git-filter-repo (Modern Alternative)

### Step 1: Install

```bash
pip install git-filter-repo
```

### Step 2: Run Cleanup

```bash
git filter-repo --path app/config.js --invert-paths
git filter-repo --path app/config.prod.js --invert-paths
```

### Step 3: Re-add Remote and Push

```bash
git remote add origin https://github.com/YOUR_USERNAME/baratie.git
git push origin --force --all
git push origin --force --tags
```

---

## Verification

After cleanup, verify keys are removed:

### 1. Search Git History

```bash
# Search for API key patterns
git log -S"AIzaSy" --all --pretty=format:'%h %an %ad %s'
git log -S"YOUR_GEMINI_API_KEY" --all
git log -S"YOUR_YOUTUBE_API_KEY" --all
```

Should return **no results**.

### 2. Check All Blobs

```bash
git rev-list --all | while read rev; do
  git ls-tree -r $rev | while read blob; do
    git show $blob | grep -q "AIzaSy" && echo "Found in $rev"
  done
done
```

Should complete with **no output**.

### 3. Clone Fresh Repository

```bash
cd /tmp
git clone https://github.com/YOUR_USERNAME/baratie.git test-clean
cd test-clean
git log --all --full-history -- "app/config.js"
```

Should show **no commits** for deleted files.

---

## Post-Cleanup Steps

### 1. Rotate API Keys (CRITICAL)

Since your keys were public, you should rotate them:

**Gemini API Key**:
1. Go to https://makersuite.google.com/app/apikey
2. Delete the old key
3. Create a new key
4. Update `.env.local` with new key
5. Update Vercel environment variables

**YouTube API Key**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Delete the old key
3. Create a new key
4. Update `.env.local` with new key
5. Update Vercel environment variables

### 2. Update .gitignore

Ensure these are in `.gitignore`:
```gitignore
# API Keys
app/config.js
config.js
*.env
.env.local

# Vercel
.vercel/
```

### 3. Commit New Secure Version

```bash
# Now app/config.prod.js has NO keys, safe to commit
git add app/config.prod.js
git commit -m "Add serverless config (no API keys)"
git push
```

### 4. Notify Collaborators

If others are working on this repo:
```
Hi team,

I've rewritten git history to remove accidentally committed API keys.

Please:
1. Backup your local changes
2. Delete your local repo
3. Fresh clone: git clone https://github.com/YOUR_USERNAME/baratie.git
4. Re-apply your changes

Old clones will be out of sync.
```

---

## Alternative: Just Make Repository Private

**Simpler option** if you don't need public access:

1. Go to GitHub → Settings → Danger Zone
2. **Change repository visibility** → Private
3. Rotate API keys anyway (they were public)
4. Keep working without history rewrite

**Then later** when ready to go public:
- Run cleanup above
- Make repository public again

---

## Prevent Future Leaks

### 1. Pre-commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Prevent committing files with API keys
if git diff --cached --name-only | grep -E "(config\.js|\.env)"; then
  echo "❌ ERROR: Attempting to commit sensitive files!"
  echo "Files blocked: config.js, .env"
  exit 1
fi

# Prevent committing API key patterns
if git diff --cached | grep -E "AIzaSy[a-zA-Z0-9_-]{33}"; then
  echo "❌ ERROR: API key pattern detected in staged changes!"
  exit 1
fi

exit 0
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 2. GitHub Secret Scanning

GitHub automatically scans for leaked credentials. Enable:
1. Go to Settings → Code security and analysis
2. Enable **Secret scanning**
3. GitHub will alert you if API keys are detected

### 3. Use git-secrets

```bash
brew install git-secrets

cd /path/to/baratie
git secrets --install
git secrets --register-aws
git secrets --add 'AIzaSy[a-zA-Z0-9_-]{33}'
```

---

## Your Specific Case

Your `app/config.js` and `app/config.prod.js` contain:
- `GEMINI_API_KEY: 'AIzaSyAjmU9e_CwJH1mEzK817vC-zPCDi1d73l0'`
- `YOUTUBE_API_KEY: 'AIzaSyCeP-CsUjZNBghyf2IRe5i3bnivduGNWhs'`

### Recommended Steps:

1. **Rotate both keys immediately** (they're public now)
2. **Run BFG cleanup** (Option 1 above)
3. **Update .env.local** with new keys
4. **Update Vercel env vars** with new keys
5. **Commit new config.prod.js** (which has NO keys)
6. **Add pre-commit hook** to prevent future leaks

---

## Timeline

| Step | Time |
|------|------|
| Rotate API keys | 10 minutes |
| Backup repository | 2 minutes |
| Run BFG cleanup | 5 minutes |
| Force push | 1 minute |
| Update local clone | 2 minutes |
| Update env vars | 5 minutes |
| Test deployment | 10 minutes |
| **Total** | **~35 minutes** |

---

## Need Help?

- [BFG Documentation](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

