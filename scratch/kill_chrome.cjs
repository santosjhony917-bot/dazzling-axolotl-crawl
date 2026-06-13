const { execSync } = require('child_process');

try {
  const output = execSync('wmic process where "name=\'chrome.exe\'" get processid,commandline /format:list', { encoding: 'utf8' });
  const blocks = output.split('\r\r\n\r\r\n');
  let killed = 0;
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\r\n');
    let cmd = '';
    let pid = '';
    
    for (const line of lines) {
      if (line.startsWith('CommandLine=')) {
        cmd = line.substring('CommandLine='.length);
      } else if (line.startsWith('ProcessId=')) {
        pid = line.substring('ProcessId='.length).trim();
      }
    }
    
    if (pid && cmd.includes('puppeteer_user_data')) {
      console.log(`Killing process ${pid}: ${cmd.substring(0, 120)}...`);
      try {
        process.kill(parseInt(pid, 10), 'SIGKILL');
        killed++;
      } catch (err) {
        // Fallback to taskkill if native kill fails
        try {
          execSync(`taskkill /F /PID ${pid}`);
          killed++;
        } catch (e) {
          console.error(`Failed to kill ${pid}:`, e.message);
        }
      }
    }
  }
  console.log(`Killed ${killed} zombie Chrome processes.`);
} catch (err) {
  // If wmic fails or no chrome process is running
  console.log('No matching chrome processes found or error executing search:', err.message);
}
