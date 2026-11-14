@echo off
REM One-click APK build for Q-music Android (portable toolchain, no admin install needed).
REM Usage: build-apk.bat [release|standalone|debug]
setlocal
set "JAVA_HOME=C:\AI\_tools\jdk\jdk-17.0.21+9"
set "ANDROID_HOME=C:\AI\_tools\android-sdk"
set "ANDROID_SDK_ROOT=C:\AI\_tools\android-sdk"
set "GRADLE_USER_HOME=C:\AI\_tools\gradle-home"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
set "VARIANT=%~1"
if "%VARIANT%"=="" set "VARIANT=release"
if /I "%VARIANT%"=="release" set "TASK=assembleRelease"
if /I "%VARIANT%"=="standalone" set "TASK=assembleStandalone"
if /I "%VARIANT%"=="debug" set "TASK=assembleDebug"
cd /d "%~dp0android"
call "C:\AI\_tools\gradle-8.13\bin\gradle.bat" %TASK% -PreactNativeArchitectures=arm64-v8a --no-daemon
echo.
echo APK output: %~dp0android\app\build\outputs\apk\
endlocal
