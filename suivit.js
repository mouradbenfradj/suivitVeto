/*import "models/lastResultInfo.json"
console.log(result)*/

const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const {exec} = require('child_process');


function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}


async function getModulesDrupalHistoryApi(moduleName) {

    const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    return await parser.parseStringPromise(response.data);
}


async function getLatestVersionInfo(moduleName) {
    try {
        const result = await getModulesDrupalHistoryApi(moduleName);
        const releases = result.project.releases[0].release;

        const latestRelease = releases[0];
        const latestVersion = latestRelease.version[0];
        const latestReleaseDate = formatDate(latestRelease.date[0]);

        return {latestVersion, latestReleaseDate};
    } catch (error) {
        console.error(`Error fetching latest version info for ${moduleName}: ${error}`);
        return {latestVersion: 'N/A', latestReleaseDate: 'N/A'};
    }
}

async function getModuleTitle(moduleName) {
    try {
        const result = await getModulesDrupalHistoryApi(moduleName);
        const title = result.project.title[0];
        return title;
    } catch (error) {
        console.error(`Error fetching title for ${moduleName}: ${error}`);
        return 'N/A';
    }
}

function generateHtmlTable(modulesInfo) {
    let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Drupal Modules Info</title>
      <style>
          table {
              width: 100%;
              border-collapse: collapse;
          }
          th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
          }
          th {
              background-color: #f2f2f2;
          }
      </style>
  </head>
  <body>
      <h1>Drupal Modules Information</h1>
      <table>
          <tr>
              <th>Module Name</th>
              <th>Title</th>
              <th>Current Version Preprod</th>
              <th>Current Version Prod</th>
              <th>Recommended Version</th>
              <th>Recommended Version Release Date</th>
              <th>Latest Version</th>
              <th>Latest Version Release Date</th>
          </tr>`;

    modulesInfo.forEach(module => {
        html += `
          <tr>
              <td>${module.name}</td>
              <td>${module.title}</td>
              <td>${module.currentVersionPreprod}</td>
              <td>${module.currentVersionProd}</td>
              <td>${module.recommendedVersion}</td>
              <td>${module.recommendedReleaseDate}</td>
              <td>${module.latestVersion}</td>
              <td>${module.latestReleaseDate}</td>
          </tr>`;
    });

    html += `
      </table>
  </body>
  </html>`;

    return html;
}

async function getCompatibleVersion(moduleName, coreVersion) {
    try {
        console.log(`Fetching compatible version for ${moduleName} with core version ${coreVersion}`);
        const result = await getModulesDrupalHistoryApi(moduleName);

        if (!result.project || !result.project.releases || !result.project.releases[0].release) {
            throw new Error('Invalid API response structure');
        }

        const releases = result.project.releases[0].release;
        //console.log(`Releases for ${moduleName}:`, releases);

        const compatibleRelease = releases.find(release => {
            const coreCompatibility = release.core_compatibility ? release.core_compatibility[0] : '';
            return coreCompatibility.includes(coreVersion) || coreCompatibility.includes(`^${coreVersion.split('.')[0]}`);
        });

        if (compatibleRelease) {
            const recommendedVersion = compatibleRelease.version[0];
            const recommendedReleaseDate = formatDate(compatibleRelease.date[0]);
            return {recommendedVersion, recommendedReleaseDate};
        } else {
            console.warn(`No compatible version found for ${moduleName} with core version ${coreVersion}`);
            return {recommendedVersion: 'N/A', recommendedReleaseDate: 'N/A'};
        }
    } catch (error) {
        console.error(`Error fetching compatible version for ${moduleName}: ${error.message}`);
        return {recommendedVersion: 'N/A', recommendedReleaseDate: 'N/A'};
    }
}


async function checkVersionInApi(moduleName, version) {
    try {
        const result = await getModulesDrupalHistoryApi(moduleName);
        const releases = result.project.releases[0].release;

        // Vérifier si la version existe
        return releases.find(release => release.version[0] === version) || null;
    } catch (error) {
        console.error(`Error checking version ${version} for module ${moduleName}: ${error}`);
        return null;
    }
}


async function getModuleInfoFromLockFile(path) {
    try {
        const composerLock = JSON.parse(fs.readFileSync(path, 'utf8'));
        return composerLock.packages.filter(pkg => pkg.name.startsWith('drupal/') && pkg.type === 'drupal-module');
    } catch (error) {
        console.error(`Erreur lors de la lecture de ${path}: ${error}`);
        return [];
    }
}


function extractModuleNameFromHomepage(homepage) {
    const match = homepage.match(/project\/([^\/]+)/);
    return match ? match[1] : null;
}


function prepareModulesInfo(modulesProd, modulesPreprod) {
    const modulesInfo = modulesProd.map(module => {
        const moduleName = extractModuleNameFromHomepage(module.homepage);
        return {
            "name": module.name,
            "title": moduleName,
            "currentVersionPreprod": modulesPreprod[moduleName]?.dist?.reference || modulesPreprod[moduleName]?.source?.reference || modulesPreprod[moduleName]?.version || 'N/A',
            "currentVersionProd": module.dist?.reference || module.source?.reference || module.version || 'N/A',
            "recommendedVersion": 'N/A',
            "recommendedReleaseDate": 'N/A',
            "latestVersion": 'N/A',
            "latestReleaseDate": 'N/A',
            "commentaires": '',
            "typeMAJ": '',
            "url": module.homepage,
        }
    });

    // Créer un ensemble pour stocker les noms des modules présents dans modulesProd
    const moduleProdNames = new Set(modulesProd.map(module => extractModuleNameFromHomepage(module.homepage)));

    // Si modulesPreprod est un objet (et non un tableau), utiliser Object.values
    const preprodModulesArray = Array.isArray(modulesPreprod) ? modulesPreprod : Object.values(modulesPreprod);

    // Ajouter les modules de preprod qui ne sont pas dans prod
    preprodModulesArray.forEach(module => {
        const moduleName = extractModuleNameFromHomepage(module.homepage);
        if (!moduleProdNames.has(moduleName)) {
            modulesInfo.push({
                "name": module.name,
                "title": moduleName,
                "currentVersionPreprod": module.dist?.reference || module.source?.reference || module.version || 'N/A',
                "currentVersionProd": 'N/A',  // Pas de version en prod pour ces modules
                "recommendedVersion": 'N/A',
                "recommendedReleaseDate": 'N/A',
                "latestVersion": 'N/A',
                "latestReleaseDate": 'N/A',
                "commentaires": '',
                "typeMAJ": '',
                "url": module.homepage,
            });
        }
    });
    return modulesInfo;
}

// Fonction pour exécuter la commande 'composer outdated --direct' dans le dossier 'current/prod'
function runComposerOutdated(directory) {
    return new Promise((resolve, reject) => {
        const options = {cwd: directory}; // Change le répertoire au dossier prod
        exec('composer outdated --direct', options, (error, stdout, stderr) => {
            if (error) {
                reject(`Erreur lors de l'exécution de 'composer outdated': ${stderr}`);
                return;
            }
            console.log(`${process.cwd()}/prod composer outdated --direct`);
            resolve(stdout);
        });
    });
}

// Fonction pour analyser la sortie de 'composer outdated --direct'
function parseComposerOutdated(output) {
    const lines = output.split('\n').slice(3); // Ignorer les premières lignes de légende
    const modules = {};
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/); // Diviser les lignes par les espaces
        if (parts.length >= 3) {
            const moduleName = parts[0]; // Nom du module
            const recommendedVersion = parts[parts.length - 1]; // Dernière colonne, version recommandée
            // Stocker dans un objet pour un accès facile
            if (recommendedVersion.startsWith('!')) {
                modules[moduleName] = recommendedVersion.substring(1); // Enlever le '!' pour obtenir la version
            } else if (recommendedVersion.startsWith('~')) {
                modules[moduleName] = recommendedVersion.substring(1); // Enlever le '~' pour obtenir la version
            } else {
                modules[moduleName] = recommendedVersion; // Version sans préfixe
            }
        }
    });
    return modules;
}

// Fonction pour fusionner les tableaux d'outdated
function mergeOutdatedOutputs(outdatedProd, outdatedPreprod) {
    const merged = {};

    // Fonction pour ajouter les éléments au tableau fusionné
    const addToMerged = (outdated, source) => {
        for (const [module, version] of Object.entries(outdated)) {
            if (merged[module]) {
                // Si le module existe déjà, vérifier la version
                if (merged[module] !== version) {
                    console.log(`Version différente pour ${module}: ${merged[module]} (prod) vs ${version} (preprod)`);
                    merged[module] = version; // Garder la version de preprod
                }
            } else {
                // Ajouter le module au tableau fusionné
                merged[module] = version;
            }
        }
    };

    // Ajouter les modules de production et de préproduction
    addToMerged(outdatedProd, 'prod');
    addToMerged(outdatedPreprod, 'preprod');

    return merged;
}

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

// N'oubliez pas d'appeler la fonction main
main().catch(error => console.error(error));
