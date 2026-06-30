param(
  [int]$Seconds = 45
)

$extensionId = 'hehggadaopoacecdllhhajmbjkdcmajg'
$deadline = (Get-Date).AddSeconds($Seconds)
Write-Output "[codex-chrome-hold] Janela de reinstalacao ativa por $Seconds segundos. Clique em desinstalar/reinstalar no Codex agora."

while ((Get-Date) -lt $deadline) {
  $procs = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq 'extension-host.exe') -or
    ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*extension-host.exe*') -or
    ($_.CommandLine -like "*chrome-extension://$extensionId*")
  }

  foreach ($proc in $procs) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Output "[codex-chrome-hold] STOPPED=$($proc.ProcessId) $($proc.Name)"
    } catch {
      Write-Output "[codex-chrome-hold] FAILED=$($proc.ProcessId) $($_.Exception.Message)"
    }
  }

  Start-Sleep -Milliseconds 800
}

Write-Output '[codex-chrome-hold] Janela encerrada. Se a reinstalacao terminou, abra o Chrome e confira Connected no popup da extensao Codex.'
