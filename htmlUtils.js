// htmlUtils.js

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

module.exports = {
    generateHtmlTable,
};
