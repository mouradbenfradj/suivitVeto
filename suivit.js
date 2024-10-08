const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const {exec} = require('child_process');

// Fonction pour exécuter la commande composer outdated dans un répertoire spécifié
function runComposerOutdated(directory) {
    return new Promise((resolve, reject) => {
        exec('composer outdated --direct', { cwd: directory }, (error, stdout, stderr) => {
            if (error) {
                reject(`Erreur lors de l'exécution de la commande: ${stderr}`);
                return;
            }
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
            const recommendedVersion = parts[2]; // Version recommandée
            modules[moduleName] = recommendedVersion; // Stocker dans un objet pour un accès facile
        }
    });

    return modules;
}


function extractVersionFromUrl(url) {
    const match = url.match(/projects\/.*-(.*)\.zip/);
    return match ? match[1] : null;
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function extractModuleNameFromHomepage(homepage) {
    const match = homepage.match(/project\/([^\/]+)/);
    return match ? match[1] : null;
}

async function getLatestVersionInfo(moduleName) {
    try {
        const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
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
        const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
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
        const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

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

// Fonction pour exécuter la commande 'composer outdated --direct' dans le dossier 'current/prod'
function runComposerOutdated() {
    return new Promise((resolve, reject) => {
        const options = {cwd: `${process.cwd()}/prod`}; // Change le répertoire au dossier prod
        exec('composer outdated --direct', options, (error, stdout, stderr) => {
            if (error) {
                reject(`Erreur lors de l'exécution de la commande: ${stderr}`);
                return;
            }
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

async function checkVersionInApi(moduleName, version) {
    try {
        const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
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
async function main() {
    console.log('Starting script...');
    // Récupération des modules à partir des fichiers composer.lock
    const modulesProd = await getModuleInfoFromLockFile('prod/composer.lock');
    const modulesPreprod = await getModuleInfoFromLockFile('preprod/composer.lock');

    const oModulesPreprod = modulesPreprod.reduce((acc, module) => {
        const m1 = extractModuleNameFromHomepage(module.homepage);
        acc[m1] = module;
        return acc;
    }, {});

    const modulesInfo = [];

    // Exécuter composer outdated pour obtenir les versions recommandées
    const outdatedOutput = await runComposerOutdated();
    const recommendedVersions = parseComposerOutdated(outdatedOutput);
    const nbrOp = modulesProd.length;
    let i = 0;
    for (const moduleProd of modulesProd) {
        console.log(++i + '/' + nbrOp)
        const moduleProdName = extractModuleNameFromHomepage(moduleProd.homepage);

        const currentVersionProd = moduleProd.dist?.reference || moduleProd.source?.reference || moduleProd.version || 'N/A';
        const currentVersionPreprod = oModulesPreprod[moduleProdName]?.dist?.reference || oModulesPreprod[moduleProdName]?.source?.reference || oModulesPreprod[moduleProdName]?.version || 'N/A';
        console.log(moduleProd.name + " version " + recommendedVersions[moduleProd.name])
        let recommendedVersion = recommendedVersions[moduleProd.name] || 'N/A';
        let recommendedReleaseDate = 'N/A'; // Vous pouvez ajuster cela selon vos besoins, ou récupérer cette information d'une autre manière
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
        });

        //console.log(`Processed module: ${moduleProd.name}`);
    }

    // Générer le code HTML et l'enregistrer dans un fichier
    const html = generateHtmlTable(modulesInfo);
    fs.writeFileSync('modules_info.html', html);
    console.log('HTML file created: modules_info.html');
}

// N'oubliez pas d'appeler la fonction main
main().catch(error => console.error(error));
