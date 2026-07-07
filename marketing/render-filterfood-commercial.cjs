const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const puppeteer = require("puppeteer");

const root = path.resolve(__dirname, "..");
const marketingDir = __dirname;
const framesDir = path.join(marketingDir, "frames");
const outputPath = path.join(marketingDir, "filterfood-commercial-10s.mp4");
const width = 1920;
const height = 1080;
const fps = 30;
const duration = 10;
const totalFrames = fps * duration;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  }[ext] || "application/octet-stream";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    let candidate;
    if (pathname === "/") {
      candidate = path.join(marketingDir, "filterfood-commercial.html");
    } else if (pathname.startsWith("/assets/") || pathname.startsWith("/images/")) {
      candidate = path.join(root, "public", pathname.replace(/^\/+/, ""));
    } else {
      candidate = path.join(root, pathname.replace(/^\/+/, ""));
    }
    const resolved = path.resolve(candidate);

    if (!resolved.startsWith(root) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType(resolved) });
    fs.createReadStream(resolved).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function getFfmpegPath() {
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch (_) {}
  return "ffmpeg";
}

async function captureFrames(server) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const { port } = server.address();
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width, height, deviceScaleFactor: 1 },
    args: ["--disable-web-security", "--font-render-hinting=none"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/marketing/filterfood-commercial.html`, {
      waitUntil: "networkidle0",
    });
    await page.evaluateHandle("document.fonts.ready");

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const time = frame / fps;
      await page.evaluate((t) => window.renderAt(t), time);
      const filename = `filterfood_${String(frame + 1).padStart(6, "0")}.png`;
      await page.screenshot({
        path: path.join(framesDir, filename),
        type: "png",
        clip: { x: 0, y: 0, width, height },
        captureBeyondViewport: false,
      });

      if ((frame + 1) % 30 === 0) {
        process.stdout.write(`Captured ${frame + 1}/${totalFrames} frames\n`);
      }
    }
  } finally {
    await browser.close();
  }
}

function encodeVideo() {
  const ffmpegPath = getFfmpegPath();
  const framePattern = path.join(framesDir, "filterfood_%06d.png");
  const music = "sine=frequency=196:sample_rate=48000:duration=10";
  const clicks = "aevalsrc='if(gt(mod(t,0.5),0.44),0.11*sin(2*PI*880*t)*exp(-90*(mod(t,0.5)-0.44)),0)':s=48000:d=10";

  const args = [
    "-y",
    "-framerate", String(fps),
    "-i", framePattern,
    "-f", "lavfi",
    "-i", music,
    "-f", "lavfi",
    "-i", clicks,
    "-filter_complex", "[1:a][2:a]amix=inputs=2:duration=first:weights=0.18 0.8,afade=t=in:st=0:d=0.2,afade=t=out:st=9.5:d=0.5[a]",
    "-map", "0:v:0",
    "-map", "[a]",
    "-t", String(duration),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "160k",
    outputPath,
  ];

  const result = spawnSync(ffmpegPath, args, { stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error(
      `FFmpeg failed. Install it or run: npm install --no-save ffmpeg-static\nFrames are available at ${framesDir}`
    );
  }
}

(async () => {
  const server = await startServer();
  try {
    await captureFrames(server);
    encodeVideo();
    console.log(`\nDone: ${outputPath}`);
  } finally {
    server.close();
  }
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
