import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

const dbDir = path.resolve('..', 'postgres_data');

console.log('🐘 Initializing native PostgreSQL engine at:', dbDir);

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: 5432,
  user: 'postgres',
  password: 'GovSecurePassword2026!',
  persistent: true,
  onLog: (msg) => console.log('[PostgreSQL]', msg),
  onError: (err) => console.error('[PostgreSQL Error]', err),
});

async function main() {
  try {
    console.log('📦 Initializing PostgreSQL cluster...');
    await pg.initialise();
    console.log('🚀 Starting PostgreSQL server on port 5432...');
    await pg.start();
    console.log('✅ PostgreSQL is running!');

    try {
      await pg.createDatabase('govedms_production');
      console.log('🗄️ Created database: govedms_production');
    } catch (e) {
      console.log('ℹ️ Database govedms_production already exists or created');
    }

    // Keep process alive
    console.log('🟢 Native PostgreSQL Server listening on port 5432...');
    setInterval(() => {}, 60000);
  } catch (err) {
    console.error('❌ Failed to start PostgreSQL:', err);
    process.exit(1);
  }
}

main();
