const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
    console.log('Starting PDF generation test...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);

        await page.setViewport({ width: 1123, height: 794 });

        const templatePath = path.join(__dirname, 'src', 'templates', 'certificate.html');
        console.log('Reading template from:', templatePath);
        if (!fs.existsSync(templatePath)) {
            console.error('Template NOT found!');
            return;
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Dummy data
        const studentName = 'TEST STUDENT';
        const courseName = 'TEST COURSE';
        const regNo = 'LCA-CERT-2026-001';
        const dateStr = '26 January 2026';
        const code = 'TEST-UUID';
        const provider = 'Lets Care All';

        htmlContent = htmlContent
            .replace(/\{\{STUDENT_NAME\}\}/g, studentName)
            .replace(/\{\{COURSE_NAME\}\}/g, courseName)
            .replace(/\{\{REG_NO\}\}/g, regNo)
            .replace(/\{\{DATE\}\}/g, dateStr)
            .replace(/\{\{ISSUE_DATE\}\}/g, dateStr)
            .replace(/\{\{CERTIFICATE_ID\}\}/g, code)
            .replace(/\{\{PROVIDER\}\}/g, provider);

        console.log('Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'load' });

        console.log('Waiting for fonts...');
        try {
            await page.evaluateHandle('document.fonts.ready');
        } catch (fontErr) {
            console.warn('Font loading timed out');
        }

        const outPath = path.join(__dirname, 'test_cert.pdf');
        console.log('Generating PDF to:', outPath);
        await page.pdf({
            path: outPath,
            printBackground: true,
            preferCSSPageSize: true,
            width: '1123px',
            height: '794px',
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        console.log('PDF generated successfully!');
    } catch (err) {
        console.error('Error during PDF generation:', err);
    } finally {
        if (browser) await browser.close();
        console.log('Test finished.');
    }
}

testPdfGeneration();
