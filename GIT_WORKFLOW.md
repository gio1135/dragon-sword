## Dragon Sword Git & Realm Workflow

### Branches
- `main`: Production code that goes to the Realm.
- `develop`: Working branch for developing and testing new features.

---

### Everyday Feature Development
Work on `develop` branch for all new features.
```powershell
git checkout develop
# ... make your code changes ...
python update.py dev
git add .
git commit -m "Description of feature or change"
git push origin develop
```

---

### Fixing Bugs in Production (`main`) While Working on `develop`
If a bug occurs on the Realm (`main`) while you are in the middle of developing a new feature on `develop`:

#### Step 1: Save or Stash Your Unfinished Feature Work
```powershell
git stash
```

#### Step 2: Switch to `main`
```powershell
git checkout main
```

#### Step 3: Fix the Bug & Release
Fix the bug in your code, then run a patch bump:
```powershell
python update.py patch
```

#### Step 4: Commit & Push to `main`
```powershell
git add .
git commit -m "Fix bug on Realm"
git push origin main
```

#### Step 5: Bring the Bug Fix Back into `develop` & Resume Feature Work
Switch back to `develop` and merge `main`:
```powershell
git checkout develop
git merge main
git stash pop
```
Now `develop` has the bug fix AND your feature progress, so the bug won't return when you finish your feature!

---

### Releasing a Completed Feature from `develop` to `main`
When a feature on `develop` is finished and ready for the Realm:
```powershell
git checkout main
git merge develop
python update.py minor
git add .
git commit -m "Release vX.X.X to main"
git push origin main
git checkout develop
```