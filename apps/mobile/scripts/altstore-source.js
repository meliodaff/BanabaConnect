// Writes the AltStore source (source.json) for a freshly built BanabaConnect.ipa.
//
// AltStore refuses to install an app whose permissions don't match its source exactly, so the
// version details and permissions are read from the built app instead of being typed by hand.
// The descriptions and colors come from altstore/source.template.json.
//
// Usage:
//   node scripts/altstore-source.js --info <Info.plist as JSON> --ipa <BanabaConnect.ipa>
//     --hosting-url <public folder URL> [--notes "What's new"] --out <source.json>
//
// --hosting-url is where BanabaConnect.ipa and icon.png can be downloaded from, e.g. a GitHub
// Release: https://github.com/<owner>/<repo>/releases/download/v1.0.0
const fs = require('node:fs');
const path = require('node:path');

function readArg(name, { required = true } = {}) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (required && !value) {
    console.error(`Missing --${name}`);
    process.exit(1);
  }
  return value;
}

const info = JSON.parse(fs.readFileSync(readArg('info'), 'utf8'));
const ipaPath = readArg('ipa');
const outPath = readArg('out');
const notes = readArg('notes', { required: false }) || 'Bug fixes and improvements.';
const hostingUrl = readArg('hosting-url').trim().replace(/\/+$/, '');

if (!/^https:\/\/\S+$/.test(hostingUrl)) {
  console.error(`--hosting-url must be a public https:// address, got "${hostingUrl}"`);
  process.exit(1);
}

const source = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'altstore', 'source.template.json'), 'utf8'),
);
const app = source.apps[0];

source.iconURL = `${hostingUrl}/icon.png`;
app.iconURL = `${hostingUrl}/icon.png`;
app.bundleIdentifier = info.CFBundleIdentifier;
app.versions = [
  {
    version: info.CFBundleShortVersionString,
    buildVersion: info.CFBundleVersion,
    date: new Date().toISOString(),
    localizedDescription: notes,
    downloadURL: `${hostingUrl}/${path.basename(ipaPath)}`,
    size: fs.statSync(ipaPath).size,
    minOSVersion: info.MinimumOSVersion,
  },
];
// The build is unsigned and has no entitlements; AltStore adds its own when it signs the app.
app.appPermissions = {
  entitlements: [],
  privacy: Object.fromEntries(
    Object.entries(info)
      .filter(([key]) => /^NS\w+UsageDescription$/.test(key))
      .sort(([a], [b]) => a.localeCompare(b)),
  ),
};

fs.writeFileSync(outPath, `${JSON.stringify(source, null, 2)}\n`);

const [version] = app.versions;
console.log(`Wrote ${outPath}`);
console.log(`  ${app.bundleIdentifier} ${version.version} (${version.buildVersion}), ${version.size} bytes`);
console.log(`  Download URL: ${version.downloadURL}`);
console.log(`  Permissions: ${Object.keys(app.appPermissions.privacy).join(', ') || 'none'}`);
