const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '..', '.vercel', 'output', 'static', '_worker.js');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (content.includes('"async_hooks"')) {
                content = content.replace(/"async_hooks"/g, '"node:async_hooks"');
                modified = true;
                console.log('Patched double quotes:', fullPath);
            }
            if (content.includes("'async_hooks'")) {
                content = content.replace(/'async_hooks'/g, "'node:async_hooks'");
                modified = true;
                console.log('Patched single quotes:', fullPath);
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
}

replaceInFiles(directory);
console.log('Patching complete.');
