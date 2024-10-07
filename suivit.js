const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');

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

async function getReleaseDate(moduleName, version) {
  try {
    const url = `https://updates.drupal.org/release-history/${moduleName}/all`;
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    const releases = result.project.releases[0].release;

    const release = releases.find(release => release.version[0] === version);
    return release ? formatDate(release.date[0]) : 'N/A';
  } catch (error) {
    console.error(`Error fetching release date for ${moduleName} version ${version}: ${error}`);
    return 'N/A';
  }
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

    return { latestVersion, latestReleaseDate };
  } catch (error) {
    console.error(`Error fetching latest version info for ${moduleName}: ${error}`);
    return { latestVersion: 'N/A', latestReleaseDate: 'N/A' };
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
              <th>Current Version</th>
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
              <td>${module.currentVersion}</td>
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

async function main() {
  const composerLock = JSON.parse(fs.readFileSync('prod/composer.lock', 'utf8'));
  const modules = composerLock.packages.filter(pkg => pkg.name.startsWith('drupal/') && pkg.type === 'drupal-module');
  const modulesInfo = [];

  for (const module of modules) {
    const moduleName = extractModuleNameFromHomepage(module.homepage);

    const currentVersion = module.dist?.reference || module.source?.reference || module.version || 'N/A';
    const recommendedVersion = module.dist?.reference || module.source?.reference || 'N/A';
    const recommendedReleaseDate = await getReleaseDate(moduleName, recommendedVersion);
    const { latestVersion, latestReleaseDate } = await getLatestVersionInfo(moduleName);
    const moduleTitle = await getModuleTitle(moduleName);

    // Ajout des informations sur le module à l'array
    modulesInfo.push({
      name: module.name,
      title: moduleTitle,
      currentVersion,
      recommendedVersion,
      recommendedReleaseDate,
      latestVersion,
      latestReleaseDate,
    });
  }

  // Générer le code HTML et l'enregistrer dans un fichier
  const html = generateHtmlTable(modulesInfo);
  fs.writeFileSync('modules_info.html', html);
  console.log('HTML file created: modules_info.html');
}

main();
