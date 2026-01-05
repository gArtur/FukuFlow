const fs = require('fs');
const path = require('path');

const exePath = path.join(__dirname, '../dist-exe/fukuflow.exe');

try {
    if (!fs.existsSync(exePath)) {
        console.error(`Executable not found at: ${exePath}`);
        process.exit(1);
    }

    const buffer = fs.readFileSync(exePath);

    // 1. Read e_lfanew (pointer to PE header) at offset 0x3C
    const peHeaderOffset = buffer.readUInt32LE(0x3C);

    // 2. Calculate Subsystem offset
    // PE Signature (4 bytes) + File Header (20 bytes) + Optional Header offset to Subsystem (68 bytes for PE32+)
    // Note: pkg generates 64-bit binaries (node18-win-x64), so specific offset applies.
    // Offset relative to PE Header start: 4 + 20 + 68 = 92 (0x5C)
    const subsystemOffset = peHeaderOffset + 0x5C;

    // 3. Read current subsystem
    const currentSubsystem = buffer.readUInt16LE(subsystemOffset);
    console.log(`Current Subsystem: ${currentSubsystem} (${currentSubsystem === 3 ? 'Console' : 'GUI'})`);

    if (currentSubsystem === 3) {
        // 4. Change to 2 (Windows GUI)
        buffer.writeUInt16LE(2, subsystemOffset);
        fs.writeFileSync(exePath, buffer);
        console.log('Successfully patched executable to Windows GUI subsystem (Hidden Console).');
    } else {
        console.log('Executable is already using GUI subsystem or unknown type.');
    }

} catch (err) {
    console.error('Failed to patch executable:', err);
    process.exit(1);
}
