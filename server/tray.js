const SysTray = require('systray2').default;
const Winreg = require('winreg');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * Get the base64 encoded ICO icon.
 * Works both in development and when packaged with pkg.
 */
function getIconBase64() {
    // Icon location (copied to server/ during build)
    const iconPath = path.join(__dirname, 'logo.ico');

    try {
        if (fs.existsSync(iconPath)) {
            const iconBuffer = fs.readFileSync(iconPath);
            return iconBuffer.toString('base64');
        }
    } catch (err) {
        console.warn('Error reading icon:', err);
    }

    console.warn('Could not find logo.ico, using empty icon');
    return '';
}

class TrayManager {
    constructor(port) {
        this.port = port;
        this.tray = null;
        this.autoRunKey = new Winreg({
            hive: Winreg.HKCU,
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
        });
        this.appName = 'FukuFlow';
        this.appPath = process.execPath;
    }

    async initialize() {
        const isAutoRunEnabled = await this.checkAutoRun();
        const iconBase64 = getIconBase64();

        const itemOpen = {
            title: 'Open FukuFlow',
            tooltip: 'Open the application in your browser',
            checked: false,
            enabled: true
        };

        const itemAutoRun = {
            title: 'Run at Startup',
            tooltip: 'Launch FukuFlow when Windows starts',
            checked: isAutoRunEnabled,
            enabled: true
        };

        const itemExit = {
            title: 'Exit',
            tooltip: 'Stop the server and exit',
            checked: false,
            enabled: true
        };

        this.tray = new SysTray({
            menu: {
                icon: iconBase64,
                title: 'FukuFlow Server',
                tooltip: 'FukuFlow Wealth Management',
                items: [itemOpen, itemAutoRun, SysTray.separator, itemExit]
            },
            debug: false,
            copyDir: true
        });

        this.tray.onClick(action => {
            switch (action.item.title) {
                case 'Open FukuFlow':
                    this.openBrowser();
                    break;
                case 'Run at Startup':
                    this.toggleAutoRun(action.item);
                    break;
                case 'Exit':
                    this.exitApp();
                    break;
            }
        });

        console.log('System Tray initialized');
    }

    openBrowser() {
        const url = `http://localhost:${this.port}`;
        exec(`start ${url}`);
    }

    async checkAutoRun() {
        return new Promise((resolve) => {
            this.autoRunKey.get(this.appName, (err, item) => {
                resolve(!err && item != null);
            });
        });
    }

    async toggleAutoRun(item) {
        const isEnabled = item.checked;

        if (isEnabled) {
            this.autoRunKey.remove(this.appName, (err) => {
                if (err) console.error('Failed to disable auto-run:', err);
                else {
                    item.checked = false;
                    this.tray.sendAction({
                        type: 'update-item',
                        item: item,
                    });
                }
            });
        } else {
            this.autoRunKey.set(this.appName, Winreg.REG_SZ, `"${this.appPath}"`, (err) => {
                if (err) console.error('Failed to enable auto-run:', err);
                else {
                    item.checked = true;
                    this.tray.sendAction({
                        type: 'update-item',
                        item: item,
                    });
                }
            });
        }
    }

    exitApp() {
        if (this.tray) {
            this.tray.kill();
        }
        process.exit(0);
    }
}

module.exports = TrayManager;
