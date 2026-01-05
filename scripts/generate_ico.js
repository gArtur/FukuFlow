const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo.png');
const tempPath = path.join(__dirname, '../public/logo_clean.png');
const outputPath = path.join(__dirname, '../server/logo.ico');

async function generateIco() {
    try {
        // Step 1: Normalize the PNG using sharp (resize to 256x256 for best ICO quality)
        await sharp(inputPath)
            .resize(256, 256)
            .png()
            .toFile(tempPath);

        console.log('Created clean PNG:', tempPath);

        // Step 2: Convert to ICO
        const buf = await pngToIco([tempPath]);
        fs.writeFileSync(outputPath, buf);
        console.log('Successfully created logo.ico');

        // Step 3: Cleanup temp file
        fs.unlinkSync(tempPath);
    } catch (err) {
        console.error('Error creating ICO:', err);
        process.exit(1);
    }
}

generateIco();
