@echo off
set GIT_CMD="C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"

echo [LeadGen Pro] Staging changes...
%GIT_CMD% add .

echo [LeadGen Pro] Creating commit...
if "%~1"=="" (
    %GIT_CMD% commit -m "update: live site sync"
) else (
    %GIT_CMD% commit -m "%~1"
)

echo [LeadGen Pro] Pushing to GitHub...
%GIT_CMD% push origin main

echo.
echo ==============================================================
echo [SUCCESS] Pushed to GitHub!
echo Vercel will now automatically build and update your live site!
echo ==============================================================
