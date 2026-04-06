@echo off
chcp 65001 >nul
title WaveNet Monitor — Instalação

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║      WaveNet Monitor — Instalação        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js não encontrado!
    echo  Baixe e instale em: https://nodejs.org
    echo  Depois execute este script novamente.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js encontrado: %NODE_VER%

:: Verificar NPM
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] NPM não encontrado!
    pause
    exit /b 1
)

echo  [OK] NPM encontrado.
echo.
echo  Instalando dependências (pode levar alguns minutos)...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Falha ao instalar dependências.
    echo  Verifique sua conexão com a internet e tente novamente.
    pause
    exit /b 1
)

echo.
echo  [OK] Dependências instaladas com sucesso!
echo.
echo  ══════════════════════════════════════════
echo  Escolha uma opção:
echo.
echo    [1] Executar em modo de desenvolvimento
echo    [2] Gerar instalador para Windows (.exe)
echo    [3] Gerar versão portátil (.exe)
echo    [4] Sair
echo.
set /p OPCAO="  Digite o número da opção: "

if "%OPCAO%"=="1" (
    echo.
    echo  Iniciando WaveNet Monitor em modo de desenvolvimento...
    echo  Pressione Ctrl+C para encerrar.
    echo.
    call npm run dev
) else if "%OPCAO%"=="2" (
    echo.
    echo  Gerando instalador... Aguarde.
    call npm run dist
    echo.
    echo  [OK] Instalador gerado na pasta "release\"
    explorer release
    pause
) else if "%OPCAO%"=="3" (
    echo.
    echo  Gerando versão portátil... Aguarde.
    call npm run dist:portable
    echo.
    echo  [OK] Executável portátil gerado na pasta "release\"
    explorer release
    pause
) else (
    exit /b 0
)
