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

async function main() {
  const composerLock = JSON.parse(fs.readFileSync('composer.lock', 'utf8'));
  const modules = composerLock.packages.filter(pkg => pkg.name.startsWith('drupal/') && pkg.type === 'drupal-module');

  for (const module of modules) {
    const moduleName = extractModuleNameFromHomepage(module.homepage);
    const currentVersion = module.version || 'N/A';
    const recommendedVersion = module.dist?.reference || module.source?.reference || 'N/A';
    const recommendedReleaseDate = await getReleaseDate(moduleName, recommendedVersion);
    const { latestVersion, latestReleaseDate } = await getLatestVersionInfo(moduleName);
    const moduleTitle = await getModuleTitle(moduleName);

    console.log(`Module: ${module.name}`);
    console.log(`Title: ${moduleTitle}`);
    console.log(`Current Version: ${currentVersion}`);
    console.log(`Recommended Version: ${recommendedVersion}`);
    console.log(`Recommended Version Release Date: ${recommendedReleaseDate}`);
    console.log(`Latest Version: ${latestVersion}`);
    console.log(`Latest Version Release Date: ${latestReleaseDate}`);
    console.log('-----------------------------');
  }
}

main();
