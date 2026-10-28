import { spawn } from 'node:child_process';

/** Run browser checks against this checkout, never an unrelated occupied port. */
export async function withPreview(check) {
  if (process.env.TEST_BASE_URL) return check(process.env.TEST_BASE_URL);
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview startup timed out')), 15000);
      let output = '';
      server.stdout.on('data', chunk => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited with ${code}`)); });
    });
    return await check(url);
  } finally {
    server.kill('SIGTERM');
  }
}
