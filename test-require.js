console.log('Testing require...');
try {
    const fs = require('fs');
    console.log('Require works!');
} catch (e) {
    console.error('Require failed:', e.message);
}
