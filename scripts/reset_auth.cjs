const { db } = require('../server/db');

function resetAuth() {
    console.log('Resetting authentication...');
    db.run('DELETE FROM auth WHERE id = 1', function (err) {
        if (err) {
            console.error('Error resetting auth:', err);
        } else {
            console.log('Authentication reset. You will see the Setup screen next time.');
        }
        db.close();
    });
}

resetAuth();
