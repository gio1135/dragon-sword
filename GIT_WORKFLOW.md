## Saving your work
When you finish a feature or make a good chunk of progress, you save it
```powershell
git add .
git commit -m "brief description of what you did"
```

## Trying something risky
If you're about to try a crazy idea and aren't sure it will work, create a branch
```powershell
git checkout -b new-boss-ai
```
Now you can safely code. If it works, you save it and merge it back. If it completely breaks your addon, you can throw the branch away and return to your main timeline
```powershell
git checkout master
```

## Undoing a mistake
If you made changes to a file but haven't committed yet, and you just want to undo everything to the last save
```powershell
git restore .
```