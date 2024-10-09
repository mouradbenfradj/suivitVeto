// apiUtils.js

const axios = require('axios');
const xml2js = require('xml2js');

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
    getLatestVersionInfo,
    getModuleTitle,
    getCompatibleVersion,
};
