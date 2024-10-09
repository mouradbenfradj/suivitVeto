// main.js

const { getLatestVersionInfo, getModuleTitle, getCompatibleVersion } = require('./apiUtils');
const { formatDate } = require('./formatUtils');
const { generateHtmlTable } = require('./htmlUtils');

// Exemple d'utilisation des fonctions
async function main() {
    const moduleName = 'example_module'; // Remplacez par le nom de votre module
    const coreVersion = '9.0'; // Remplacez par votre version principale

    const latestInfo = await getLatestVersionInfo(moduleName);
    const moduleTitle = await getModuleTitle(moduleName);
    const compatibleVersion = await getCompatibleVersion(moduleName, coreVersion);

    const modulesInfo = [{
        name: moduleName,
        title: moduleTitle,
        currentVersionPreprod: '1.0',
        currentVersionProd: '1.0',
        recommendedVersion: compatibleVersion.recommendedVersion,
        recommendedReleaseDate: compatibleVersion.recommendedReleaseDate,
        latestVersion: latestInfo.latestVersion,
        latestReleaseDate: latestInfo.latestReleaseDate,
    }];

    const htmlTable = generateHtmlTable(modulesInfo);
    console.log(htmlTable); // ou enregistrez-le dans un fichier
}

// Exécuter la fonction principale
main();
