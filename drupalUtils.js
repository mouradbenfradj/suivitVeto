// drupalUtils.js

const axios = require('axios');
const xml2js = require('xml2js');

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

        return { latestVersion, latestReleaseDate };
    } catch (error) {
        console.error(`Error fetching latest version info for ${moduleName}: ${error}`);
        return { latestVersion: 'N/A', latestReleaseDate: 'N/A' };
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

        const compatibleRelease = releases.find(release => {
            const coreCompatibility = release.core_compatibility ? release.core_compatibility[0] : '';
            return coreCompatibility.includes(coreVersion) || coreCompatibility.includes(`^${coreVersion.split('.')[0]}`);
        });

        if (compatibleRelease) {
            const recommendedVersion = compatibleRelease.version[0];
            const recommendedReleaseDate = formatDate(compatibleRelease.date[0]);
            return { recommendedVersion, recommendedReleaseDate };
        } else {
            console.warn(`No compatible version found for ${moduleName} with core version ${coreVersion}`);
            return { recommendedVersion: 'N/A', recommendedReleaseDate: 'N/A' };
        }
    } catch (error) {
        console.error(`Error fetching compatible version for ${moduleName}: ${error}`);
        return { recommendedVersion: 'N/A', recommendedReleaseDate: 'N/A' };
    }
}

module.exports = {
    formatDate,
    getModulesDrupalHistoryApi,
    getLatestVersionInfo,
    getModuleTitle,
    generateHtmlTable,
    getCompatibleVersion
};
