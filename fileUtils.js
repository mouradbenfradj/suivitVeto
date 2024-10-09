// fileUtils.js

const fs = require('fs');

function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON file at ${filePath}: ${error}`);
        return null;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Data successfully written to ${filePath}`);
    } catch (error) {
        console.error(`Error writing JSON file at ${filePath}: ${error}`);
    }
}

module.exports = {
    readJsonFile,
    writeJsonFile,
};
