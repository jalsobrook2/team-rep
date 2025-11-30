$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) {
  Write-Host "Stopping process $pid on port 3000"
  Stop-Process -Id $pid -Force
} else {
  Write-Host 'No process found on port 3000'
}

# Start server in foreground (nodemon) so we can see logs
npm run dev
