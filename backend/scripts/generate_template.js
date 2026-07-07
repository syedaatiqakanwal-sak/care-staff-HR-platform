const fs = require('fs');
const path = require('path');

const bgPath = path.join(__dirname, '../src/templates/certificate_bg.txt');
const outPath = path.join(__dirname, '../src/templates/certificate.html');

try {
    const base64Bg = fs.readFileSync(bgPath, 'utf8');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Certificate</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            width: 297mm;
            height: 210mm;
            font-family: 'Open Sans', sans-serif;
        }

        .certificate-container {
            width: 297mm;
            height: 210mm;
            position: relative;
            background-image: url('${base64Bg}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }

        /* 
           ABSOLUTE POSITIONING LAYOUT 
           Adjust top/left percentages based on visual inspection if possible, 
           or standard certificate layouts.
        */

        .student-name {
            top: 44%; 
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            font-size: 30pt;
            font-weight: 700;
            color: #000;
            text-transform: capitalize;
            background: rgba(255, 255, 255, 0.9); /* Cover bg text */
            padding: 5px;
        }

        .course-name {
            top: 60%;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            font-size: 24pt;
            font-weight: 600;
            color: #222;
            padding: 5px;
            background: rgba(255, 255, 255, 0.9); /* Cover bg text */
        }

        /* Footer Positions */

        .date-section {
            position: absolute;
            bottom: 34mm; 
            right: 25mm; /* Aligned to the 'Issue Date' line on right */
            font-size: 12pt;
            font-weight: 600;
            width: 50mm;
            text-align: center;
            background: rgba(255, 255, 255, 0.8);
        }

        .reg-no-section {
            position: absolute;
            top: 24mm; /* Top Right Area */
            right: 25mm;
            font-size: 12pt;
            color: #333;
            width: 60mm;
            text-align: center;
            background: rgba(255, 255, 255, 0.8);
        }

        .verification-code {
            position: absolute;
            bottom: 5mm;
            left: 5mm; /* Changed to left */
            font-size: 8pt;
            color: #999;
        }

    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="centered-text student-name">{{STUDENT_NAME}}</div>
        <div class="centered-text course-name">{{COURSE_NAME}}</div>
        
        <div class="date-section">{{DATE}}</div>
        <div class="reg-no-section">{{REG_NO}}</div>
        
        <div class="verification-code">ID: {{CERTIFICATE_ID}}</div>
    </div>
</body>
</html>`;

    fs.writeFileSync(outPath, html);
    console.log("Certificate template generated successfully at", outPath);

} catch (err) {
    console.error("Error generating template:", err);
}
