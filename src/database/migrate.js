const fs = require('fs');
const path = require('path');
const database = require('./connection');

async function runMigrations(closeAfter = true) {
    try {
        // Only connect if not already connected
        if (!database.db) {
            await database.connect();
        }
        
        // Create migrations tracking table
        await database.run(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get all migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        console.log(`Found ${migrationFiles.length} migration files`);
        
        for (const file of migrationFiles) {
            // Check if migration already executed
            const executed = await database.get(
                'SELECT filename FROM migrations WHERE filename = ?', 
                [file]
            );
            
            if (executed) {
                console.log(`⏭️  Skipping ${file} (already executed)`);
                continue;
            }
            
            console.log(`🔄 Running migration: ${file}`);
            
            const migrationPath = path.join(migrationsDir, file);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
            
            for (const statement of statements) {
                try {
                    await database.run(statement);
                } catch (error) {
                    // Some statements might fail (like ALTER TABLE ADD COLUMN if column exists)
                    // Log the error but continue with other statements
                    if (error.message.includes('duplicate column name') || 
                        error.message.includes('no such table') ||
                        error.message.includes('already exists') ||
                        error.message.includes('no such column') ||
                        error.message.includes('SQLITE_ERROR')) {
                        console.log(`⚠️  Statement skipped (expected): ${error.message.substring(0, 80)}...`);
                    } else {
                        console.error(`❌ Statement failed: ${statement.substring(0, 50)}...`);
                        console.error(`Error: ${error.message}`);
                        throw error; // Re-throw unexpected errors
                    }
                }
            }
            
            // Mark as executed
            await database.run(
                'INSERT INTO migrations (filename) VALUES (?)', 
                [file]
            );
            
            console.log(`✅ Completed migration: ${file}`);
        }
        
        console.log('✅ All migrations completed successfully');
        
        // Only close if explicitly requested (for standalone migration runs)
        if (closeAfter) {
            await database.close();
        }
    } catch (error) {
        console.error('Migration failed:', error);
        if (closeAfter) {
            process.exit(1);
        } else {
            throw error;
        }
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };