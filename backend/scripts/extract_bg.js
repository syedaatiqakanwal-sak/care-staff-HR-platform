const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../src/templates/certificate_converted.html');
const content = fs.readFileSync(htmlPath, 'utf8');

const match = content.match(/src="(data:image\/[^;]+;base64,[^"]+)"/);
if (match && match[1]) {
    const base64Data = match[1];
    // Write just the Data URI to a file for easy inclusion
    fs.writeFileSync(path.join(__dirname, '../src/templates/certificate_bg.txt'), base64Data);
    console.log("Background image extracted.");
} else {
    console.error("No image found.");
}
