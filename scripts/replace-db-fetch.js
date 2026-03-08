const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const apiDir = path.join(__dirname, '..', 'app', 'api');
console.log(`Searching for files in ${apiDir}`);

walkDir(apiDir, function (filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace const db = getRequestContext().env.DB; with const db = await getDb()
        content = content.replace(/const db = getRequestContext\(\)\.env\.DB/g, "const db = await getDb()");

        // Check if we need to add the import
        if (content !== original) {
            // Add getDb import
            if (!content.includes('import { getDb }')) {
                content = content.replace(/import { getRequestContext } from '@cloudflare\/next-on-pages'/g, "import { getRequestContext } from '@cloudflare/next-on-pages'\nimport { getDb } from '@/lib/get-db'");
            }
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
});
