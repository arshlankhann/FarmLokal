@echo off
echo.
echo 🚀 FarmLokal Deployment Helper
echo ==============================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo 📦 Initializing Git repository...
    git init
    echo ✅ Git initialized
) else (
    echo ✅ Git already initialized
)

echo.
echo 📝 Adding files to git...
git add .

echo.
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Deploy FarmLokal to Render

echo.
echo 💾 Creating commit...
git commit -m "%commit_msg%"

echo.
echo ✅ Local commit created!
echo.
echo 📋 Next Steps:
echo 1. Create a GitHub repository at: https://github.com/new
echo 2. Run these commands (replace YOUR_USERNAME):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/farmlokal.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Deploy to Render:
echo    - Go to: https://dashboard.render.com
echo    - Click: New + → Blueprint
echo    - Select your GitHub repository
echo    - Render will auto-detect render.yaml
echo.
echo 📖 See RENDER_DEPLOYMENT.md for detailed instructions
echo.
pause
