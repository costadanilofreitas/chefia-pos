@echo off
REM Script para iniciar o sistema POS Modern no Windows
REM Autor: POS Modern Team
REM Data: 25/05/2025

REM Diretório do script
SET SCRIPT_DIR=%~dp0
SET PROJECT_ROOT=%SCRIPT_DIR%..

REM Verificar se o Docker está instalado
WHERE docker >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Docker não encontrado. Por favor, instale o Docker antes de continuar.
    exit /b 1
)

REM Verificar se o Docker Compose está instalado
WHERE docker-compose >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar.
    exit /b 1
)

REM Ir para o diretório raiz do projeto
cd "%PROJECT_ROOT%"

REM Verificar se o arquivo docker-compose.yml existe
IF NOT EXIST docker-compose.yml (
    echo Arquivo docker-compose.yml não encontrado no diretório raiz do projeto.
    exit /b 1
)

REM Iniciar os serviços
echo Iniciando o sistema POS Modern...
docker-compose up -d

REM Verificar se os serviços foram iniciados corretamente
IF %ERRORLEVEL% EQU 0 (
    echo Sistema POS Modern iniciado com sucesso!
    echo Serviços disponíveis:
    docker-compose ps
    
    echo.
    echo API Gateway disponível em: http://localhost:3000
    echo Dashboard disponível em: http://localhost:8080
    echo RabbitMQ Management disponível em: http://localhost:15672
    echo Usuário: posmodern
    echo Senha: posmodern123
    
    echo.
    echo Para parar o sistema, execute: docker-compose down
) ELSE (
    echo Erro ao iniciar o sistema POS Modern. Verifique os logs para mais detalhes.
    exit /b 1
)
