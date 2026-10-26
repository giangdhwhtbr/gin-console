@echo off
setlocal
set "BASH_EXE=bash.exe"
where /q bash.exe
if %ERRORLEVEL% NEQ 0 (
    if exist "%ProgramFiles%\Git\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
    ) else if exist "%ProgramFiles%\Git\usr\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles%\Git\usr\bin\bash.exe"
    ) else if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe"
    ) else if exist "%ProgramFiles(x86)%\Git\usr\bin\bash.exe" (
        set "BASH_EXE=%ProgramFiles(x86)%\Git\usr\bin\bash.exe"
    )
)
if exist "%~dp0gin-workflow" (
    "%BASH_EXE%" -c '"%~dp0gin-workflow" "$@"' _ %*
) else (
    "%BASH_EXE%" -c 'gin-workflow "$@"' _ %*
)
