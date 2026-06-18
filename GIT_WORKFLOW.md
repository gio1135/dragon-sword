# Dragon Sword Git Workflow

Welcome to Git! Git is like a time machine for your project. If an experiment goes wrong, you can always go back. If you want to try something wild, you can do it without risking your main code.

## 1. Saving Your Work (Commit)
When you finish a feature or make a good chunk of progress, you "save" it.
```powershell
git add .
git commit -m "Brief description of what you did"
```

## 2. Trying Something Risky (Branching)
If you're about to try a crazy idea (like a new boss AI) and aren't sure it will work, create a "branch". A branch is an alternate timeline.
```powershell
git checkout -b new-boss-ai
```
Now you can safely code. If it works, you save it (Commit) and merge it back. If it completely breaks your addon, you can throw the branch away and return to your main timeline:
```powershell
git checkout master
```

## 3. Undoing a Mistake (Revert/Restore)
If you made changes to a file but haven't committed yet, and you just want to undo everything to the last save:
```powershell
git restore .
```

*Note: As an AI agent, I will often handle these steps for you when you ask me to build a feature!*
