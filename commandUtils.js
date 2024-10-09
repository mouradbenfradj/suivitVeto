// commandUtils.js

const { exec } = require('child_process');

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
}

module.exports = {
    runCommand,
};
