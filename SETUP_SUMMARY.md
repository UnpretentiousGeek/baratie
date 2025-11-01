# ✅ Setup Complete - Next Steps

Your Baratie project has been reorganized for GitHub and Vercel deployment!

## 📁 New Structure

```
baratie/
├── app/                    # ✅ Web app (ready for Vercel)
│   ├── index.html
│   ├── app.js
│   ├── config.js          # ⚠️ Your API keys (NOT committed)
│   ├── config.js.template  # ✅ Template (committed)
│   └── styles.css
│
├── extension/              # ✅ Chrome extension
│   └── ... (all extension files)
│
├── .gitignore            # ✅ Protects API keys
├── vercel.json           # ✅ Deployment config
├── README.md             # ✅ Updated docs
└── DEPLOYMENT.md         # ✅ Deployment guide
```

## 🚀 Next Steps

### 1. Verify Your Setup

✅ Files moved to `app/` folder  
✅ `.gitignore` created (excludes `app/config.js`)  
✅ `config.js.template` created  
✅ Extension paths updated  
✅ Vercel config created  

### 2. Push to GitHub

```bash
cd "d:\Vibe Coding Projects\Baratie"

# Check what will be committed (config.js should NOT appear)
git status

# Add files
git add .

# Commit
git commit -m "Reorganize for Vercel deployment"

# Add your GitHub remote (replace with your URL)
git remote add origin https://github.com/yourusername/baratie.git

# Push
git push -u origin main
```

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `baratie` repository
5. **IMPORTANT**: Set **Root Directory** to `app`
6. Click "Deploy"

See `DEPLOYMENT.md` for detailed instructions.

### 4. Update Extension Path

After Vercel deploys, you'll get a URL like `https://baratie.vercel.app`:

1. Edit `extension/popup.js`:
   - Line 10: Update `DEFAULT_VERCEL_PATH` with your URL

2. Edit `extension/background.js`:
   - Line 92: Update `DEFAULT_VERCEL` with your URL

3. Or let users configure it via extension settings

## 🔒 Security Checklist

Before pushing to GitHub:

- [x] `app/config.js` is in `.gitignore`
- [x] `config.js.template` exists (no real keys)
- [ ] Verify `git status` doesn't show `config.js`
- [ ] Double-check `.gitignore` is working

## 📝 Important Notes

1. **API Keys**: Your `app/config.js` contains real API keys and will NOT be committed (protected by `.gitignore`)

2. **Local Development**: 
   - Continue using `app/index.html` locally
   - Your `config.js` will work as before

3. **Vercel Deployment**:
   - Vercel will deploy from `app/` folder
   - Users will need to add their own API keys
   - Consider documenting how to set up `config.js` in your README

4. **Extension**:
   - Extension can now work with both local and Vercel URLs
   - Users can configure path in extension settings

## 🎯 Testing Checklist

Before deploying:

- [ ] Open `app/index.html` locally - should work
- [ ] Test recipe extraction
- [ ] Test extension capture
- [ ] Verify `git status` excludes `config.js`
- [ ] Push to GitHub (test repository)
- [ ] Deploy to Vercel
- [ ] Test on Vercel URL
- [ ] Update extension paths
- [ ] Test extension with Vercel URL

## 📚 Documentation

- `README.md` - Main project documentation
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `docs/SETUP_GUIDE.md` - Detailed setup instructions

## ❓ Troubleshooting

**Q: Will my API keys be exposed on GitHub?**  
A: No! `app/config.js` is in `.gitignore` and won't be committed.

**Q: How do users get API keys after deployment?**  
A: They need to:
1. Get API keys from Google
2. Create their own `config.js` from `config.js.template`
3. Or you can document using environment variables (advanced)

**Q: Can I use environment variables on Vercel?**  
A: Yes, but for client-side apps it's limited. See `DEPLOYMENT.md` for options.

**Q: What if I need to change the structure?**  
A: Just update files and push. Vercel will redeploy automatically.

---

You're all set! 🎉 Ready to push to GitHub and deploy to Vercel!

