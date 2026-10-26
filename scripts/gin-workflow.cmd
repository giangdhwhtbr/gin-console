@echo off
setlocal
set "BASH_EXE=bash.exe"
where /q bash.exe
if %ERRORLEVEL% NEQ 0 (
    if exist "%ProgramFiles%\Git\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
    ) else if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe"
    )
)
"%BASH_EXE%" "%~dp0gin-workflow" %*
