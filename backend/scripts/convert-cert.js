const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join(__dirname, "../src/templates/certificate-sample.docx");
const outputPath = path.join(__dirname, "../src/templates/certificate_converted.html");

mammoth.convertToHtml({ path: inputPath })
    .then(function (result) {
        const html = result.value;
        const messages = result.messages;

        // Wrap in basic HTML structure so it's viewable
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        /* Add some basic resets */
        p { margin-bottom: 10px; }
    </style>
</head>
<body>
${html}
</body>
</html>
        `;

        fs.writeFileSync(outputPath, fullHtml);
        console.log("Conversion complete. Messages:", messages);
    })
    .catch(function (error) {
        console.error(error);
    });
