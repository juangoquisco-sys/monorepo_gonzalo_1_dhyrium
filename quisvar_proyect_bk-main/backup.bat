echo "Iniciando Backup..."
set DATABASE_CONTAINER=db_task_project
set NAME_BACKUP= ""
set OUTPUT_BACKUP_FILE=%~dp0Backup
docker exec -it %DATABASE_CONTAINER% bash -c "pg_dump -U dbtaskmanager -d dbtaskmanager > backup2.sql"
if not exist "%OUTPUT_BACKUP_FILE%" (
    mkdir "%OUTPUT_BACKUP_FILE%"
)

for /f "tokens=1-3 delims=/" %%a in ('date /t') do (
    set DAY=%%a
    set MONTH=%%b
    set YEAR=%%c
)
set FORMATTED_DATE=%DAY%_%MONTH%_%YEAR%
docker cp %DATABASE_CONTAINER%:/backup2.sql "%OUTPUT_BACKUP_FILE%\backup_%FORMATTED_DATE%.sql"
echo "Backup terminado..."
exit