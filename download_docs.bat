@echo off
set WGET_PATH="C:\Users\gio1135\AppData\Local\Microsoft\WinGet\Packages\JernejSimoncic.Wget_Microsoft.Winget.Source_8wekyb3d8bbwe\wget.exe"

cd Docs
echo Downloading wiki.bedrock.dev...
%WGET_PATH% --recursive --no-clobber --page-requisites --html-extension --convert-links --domains wiki.bedrock.dev --no-parent https://wiki.bedrock.dev/

echo Downloading bedrock.dev...
%WGET_PATH% --recursive --no-clobber --page-requisites --html-extension --convert-links --domains bedrock.dev --no-parent https://bedrock.dev/

echo Downloading Microsoft Learn API Docs...
%WGET_PATH% --recursive --no-clobber --page-requisites --html-extension --convert-links --domains learn.microsoft.com -I /en-us/minecraft/creator/documents/scripting/ --no-parent https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/introduction?view=minecraft-bedrock-stable

echo Done.
