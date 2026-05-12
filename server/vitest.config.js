const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        environment: 'node',
        globals: true,
        env: {
            NODE_ENV: 'test',
        },
    },
});
