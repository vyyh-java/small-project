const pino = require('pino');

const logger = pino({
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                level: 'info',
                options: {
                    translateTime: 'yyyy-mm-dd HH:MM:ss'
                }
            },
            {
                target: 'pino/file',
                level: 'info',
                options: {
                    destination: './app.log',
                    mkdir: true
                }
            }
        ]
    }
});

module.exports = logger;
