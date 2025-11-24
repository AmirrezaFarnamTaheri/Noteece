const fs = require("fs");
const path = require("path");

// Ensure assets directory exists
const assetsDir = path.join(__dirname, "../assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder icon.png if missing
const iconPath = path.join(assetsDir, "icon.png");
if (!fs.existsSync(iconPath)) {
  // 1x1 Transparent PNG base64
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TRANSPARENT_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  fs.writeFileSync(iconPath, TRANSPARENT_PNG);
  console.log("Created placeholder icon.png");
}

// Create placeholder adaptive-icon.png
const adaptiveIconPath = path.join(assetsDir, "adaptive-icon.png");
if (!fs.existsSync(adaptiveIconPath)) {
  fs.copyFileSync(iconPath, adaptiveIconPath);
  console.log("Created placeholder adaptive-icon.png");
}

// Create placeholder splash.png
const splashPath = path.join(assetsDir, "splash.png");
if (!fs.existsSync(splashPath)) {
  fs.copyFileSync(iconPath, splashPath);
  console.log("Created placeholder splash.png");
}

// Create placeholder favicon.png
const faviconPath = path.join(assetsDir, "favicon.png");
if (!fs.existsSync(faviconPath)) {
  fs.copyFileSync(iconPath, faviconPath);
  console.log("Created placeholder favicon.png");
}
