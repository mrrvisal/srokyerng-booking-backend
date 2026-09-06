#!/usr/bin/env node
/**
 * SQL seed runner — splits on semicolons at end-of-line and executes each statement.
 * Handles ON DUPLICATE KEY UPDATE and multi-line statements correctly.
 * Usage:  node scripts/run-seed.js src/database/seeders/010-demo-data.seed.sql
 */
const fs = require("fs");
const path = require("path");
const db = require("../src/config/db");

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/run-seed.js <path-to-sql-file>");
    process.exit(1);
  }
  const sql = path.resolve(process.cwd(), file);
  const content = fs.readFileSync(sql, "utf8");

  // Build statements line by line, skipping comments, rejoining ON DUPLICATE KEY UPDATE
  const lines = content.split("\n");
  const statements = [];
  let current = "";

  for (const line of lines) {
    // Skip comment lines
    if (line.trim().startsWith("--")) continue;

    current += line + "\n";

    // Check if this line ends a statement (semicolon at end)
    if (line.trim().endsWith(";")) {
      const stmt = current.trim();
      if (stmt) {
        if (stmt.toUpperCase().startsWith("ON DUPLICATE") && statements.length > 0) {
          // Append to previous statement
          statements[statements.length - 1] += "\n" + stmt;
        } else {
          statements.push(stmt);
        }
      }
      current = "";
    }
  }

  console.log(`Running ${statements.length} statements from ${file}...`);

  let success = 0;
  for (const stmt of statements) {
    try {
      await db.pool.promise().query(stmt + ";");
      success++;
    } catch (err) {
      console.error("FAILED:", stmt.slice(0, 120).replace(/\s+/g, " ") + "...");
      console.error("  ->", err.message);
    }
  }

  console.log(`Done: ${success}/${statements.length} statements executed successfully.`);
  process.exit(success === statements.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
