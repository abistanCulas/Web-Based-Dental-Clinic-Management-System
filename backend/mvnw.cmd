@REM ----------------------------------------------------------------------------
@REM Maven Wrapper script for Windows
@REM ----------------------------------------------------------------------------
@IF "%DEBUG%" == "" @ECHO OFF
@SETLOCAL
SET ERROR_CODE=0

@REM Set local scope for the variables with windows NT shell
IF "%OS%"=="Windows_NT" @SETLOCAL

@REM ==== START VALIDATION ====
IF NOT "%JAVA_HOME%" == "" GOTO OkJHome
FOR %%i IN (java.exe) DO SET JAVA_EXE=%%~$PATH:i
IF "%JAVA_EXE%" == "" (
  ECHO Error: JAVA_HOME not found in your environment. >&2
  ECHO Please set the JAVA_HOME variable in your environment to match the >&2
  ECHO location of your Java installation. >&2
  EXIT /B 1
)
:OkJHome

mvn %*
IF ERRORLEVEL 1 SET ERROR_CODE=1
EXIT /B %ERROR_CODE%
