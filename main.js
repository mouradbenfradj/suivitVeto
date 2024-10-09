// main.js

const { getLatestVersionInfo, getModuleTitle, getCompatibleVersion } = require('./apiUtils');
const { formatDate } = require('./formatUtils');
const { generateHtmlTable } = require('./htmlUtils');


async function main() {
    console.log('Starting script...');
    // Récupération des modules à partir des fichiers composer.lock
    const modulesProd = await getModuleInfoFromLockFile('prod/composer.lock');
    const modulesPreprod = await getModuleInfoFromLockFile('preprod/composer.lock');
    const oModulesPreprod = modulesPreprod.reduce((res, module) => {
        const m1 = extractModuleNameFromHomepage(module.homepage);
        res[m1] = module;
        return res;
    }, {});
    const outdatedOutputProd = await runComposerOutdated(`${process.cwd()}/prod`);
    const outdatedOutputPreprod = await runComposerOutdated(`${process.cwd()}/preprod`);
    const recommendedVersionsProd = parseComposerOutdated(outdatedOutputProd);
    const recommendedVersionsPreprod = parseComposerOutdated(outdatedOutputPreprod);
    const recommendedVersions = mergeOutdatedOutputs(recommendedVersionsProd, recommendedVersionsPreprod);
    const modulesInfos = prepareModulesInfo(modulesProd, oModulesPreprod);


    console.log('------------------modulesProd---------------------')
    console.log(modulesProd)
    console.log('------------------oModulesPreprod---------------------')
    console.log(oModulesPreprod)
    console.log('-----------------modulesInfos----------------------')
    console.log(modulesInfos)


    const nbrOp = modulesInfos.length;
    let i = 0;
    let b = 0;
    for (const modulesInfo of modulesInfos) {
        //console.log(++i + '/' + nbrOp);
        //if (recommendedVersions[modulesInfo.name])
        //console.log(++b + " " + modulesInfo.name + " version " + recommendedVersions[modulesInfo.name]);
        let recommendedVersion = recommendedVersions[modulesInfo.name] || 'N/A';
        let recommendedReleaseDate = 'N/A'; // Vous pouvez ajuster cela selon vos besoins, ou récupérer cette information d'une autre manière
        //console.log(" recommendedVersion " + recommendedVersion);
        //console.log(" recommendedReleaseDate " + recommendedReleaseDate);

        /*
               // Vérifier si la recommendedVersion existe dans l'API
                let apiVersionInfo = await checkVersionInApi(moduleProdName, recommendedVersion);


                // Si elle n'existe pas et si la version n'est pas une version pré-release
                if (!apiVersionInfo && !recommendedVersion.includes('-')) {
                    // Retirer la dernière partie de la version (patch)
                    while (!apiVersionInfo && recommendedVersion.includes('.')) {
                        // Enlever la dernière partie de la version
                        recommendedVersion = recommendedVersion.replace(/\.\d+$/, '');
                        apiVersionInfo = await checkVersionInApi(moduleProdName, recommendedVersion);
                    }
                }


                // Maintenant que nous avons soit trouvé la version recommandée, soit une version ajustée
                // Si la version existe, on prend la version de l'API
                if (apiVersionInfo) {
                    recommendedVersion = apiVersionInfo.version[0]; // Prendre la version formatée, par exemple 8.x-3.3
                    recommendedReleaseDate = formatDate(apiVersionInfo.date[0]); // Convertir le timestamp UNIX

                } else {
                    recommendedVersion = 'N/A'; // Si aucune version n'est trouvée
                }

                const {latestVersion, latestReleaseDate} = await getLatestVersionInfo(moduleProdName);
                const moduleTitle = await getModuleTitle(moduleProdName);

                // Ajout des informations sur le module à l'array
                modulesInfo.push({
                    name: moduleProd.name,
                    title: moduleTitle,
                    currentVersionPreprod,
                    currentVersionProd,
                    recommendedVersion,
                    recommendedReleaseDate,
                    latestVersion,
                    latestReleaseDate,
                });*/

        //console.log(`Processed module: ${moduleProd.name}`);
    }

    // Générer le code HTML et l'enregistrer dans un fichier
    //const html = generateHtmlTable(modulesInfo);
    //fs.writeFileSync('modules_info.html', html);
    console.log('HTML file created: modules_info.html');
}
// Exécuter la fonction principale
main();
