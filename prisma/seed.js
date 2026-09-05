const { execSync } = require('child_process');

const seeds = [
  { name: 'Settings', file: 'seedSettings.js' },
  { name: 'Catalog', file: 'seedCatalog.js' },
  { name: 'Blog', file: 'seedBlog.js' },
];

for (const seed of seeds) {
  console.log(`\n${'='.repeat(40)}`);
  console.log(` Running ${seed.name} seed...`);
  console.log(`${'='.repeat(40)}\n`);
  execSync(`node prisma/${seed.file}`, { stdio: 'inherit' });
}

console.log('\n✓ All seeds completed.');
