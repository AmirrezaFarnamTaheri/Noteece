const fs = require('fs');
const path = require('path');
const https = require('https');

// Simple script to create dummy PNGs for the build
// We create a minimal 1x1 pixel PNG
// Source: https://stackoverflow.com/questions/13444458/is-it-possible-to-output-a-transparent-png-image-using-just-javascript-on-the-cl
// Base64 for a 1x1 transparent PNG
const TRANSPARENT_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
// Base64 for a 1x1 black PNG
const BLACK_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
// Base64 for a 1x1 blue PNG (for adaptive icon)
const BLUE_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCb5mQAAAABJRU5ErkJggg==', 'base64');

const ASSETS_DIR = path.join(__dirname, '../assets');

const files = [
    { name: 'icon.png', data: BLACK_PNG },
    { name: 'splash.png', data: BLACK_PNG },
    { name: 'adaptive-icon.png', data: BLUE_PNG },
    { name: 'favicon.png', data: BLACK_PNG }
];

console.log('Generating fallback assets...');

files.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file.name);
    // Only create if it doesn't exist
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.data);
        console.log(`Created ${file.name}`);
    } else {
        console.log(`${file.name} already exists, skipping.`);
    }
});

console.log('Asset generation complete.');
