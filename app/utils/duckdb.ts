import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

/**
 * Initialize DuckDB-Wasm database.
 * Connects asynchronously using jsDelivr bundles and establishes the events schema.
 */
export async function initDuckDB() {
  if (db && conn) return { db, conn };

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: "text/javascript" })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  conn = await db.connect();

  // Create table matching events schema
  await conn.query(`
    CREATE TABLE IF NOT EXISTS events (
      eventId VARCHAR PRIMARY KEY,
      title VARCHAR,
      description VARCHAR,
      isPaid BOOLEAN,
      createdAt VARCHAR
    )
  `);

  return { db, conn };
}

let isSyncing = false;

/**
 * Synchronize a list of event objects from the backend into the local DuckDB.
 */
export async function syncEvents(events: any[]) {
  if (isSyncing) {
    console.log("DuckDB sync is already in progress, skipping concurrent run.");
    return;
  }
  isSyncing = true;
  try {
    const { conn } = await initDuckDB();
    
    // Deduplicate input list by eventId to prevent duplicate key insertion in the same batch
    const uniqueEvents = Array.from(new Map((events || []).filter(e => e && e.eventId).map(e => [e.eventId, e])).values());

    for (const e of uniqueEvents) {
      const eventId = e.eventId;
      const title = e.title ? e.title.replace(/'/g, "''") : "";
      const description = e.description ? e.description.replace(/'/g, "''") : "";
      const isPaid = e.isPaid ? "true" : "false";
      const createdAt = e.createdAt || "";

      // Delete existing to update
      await conn.query(`DELETE FROM events WHERE eventId = '${eventId}'`);
      await conn.query(`
        INSERT INTO events (eventId, title, description, isPaid, createdAt)
        VALUES ('${eventId}', '${title}', '${description}', ${isPaid}, '${createdAt}')
      `);
    }
    console.log("DuckDB-Wasm synced successfully with", uniqueEvents.length, "events");
  } catch (err) {
    console.error("DuckDB-Wasm sync failed:", err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Run a local SQL query against the local DuckDB state.
 */
export async function queryLocalEvents(sql: string) {
  const { conn } = await initDuckDB();
  const result = await conn.query(sql);
  return result.toArray().map((row) => row.toJSON());
}
