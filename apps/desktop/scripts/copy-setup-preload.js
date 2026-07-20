const { copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../electron/setup-preload.js');
const destination = path.resolve(__dirname, '../dist/electron/setup-preload.js');

mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
