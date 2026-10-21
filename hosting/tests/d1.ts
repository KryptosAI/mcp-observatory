import process from "node:process";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

export function testDatabase(): { db: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  let previousBatch:Promise<void>=Promise.resolve();
  sqlite.exec(readFileSync(path.join(process.cwd(), "migrations", "0001_observatory.sql"), "utf8"));

  const prepare = (sql: string, values: unknown[] = []): D1PreparedStatement => ({
    bind: (...bound: unknown[]) => prepare(sql, bound),
    run<T = Record<string, unknown>>() { return Promise.resolve().then(() => {
          const result = sqlite.prepare(sql).run(...values as never[]);
          return { success: true, meta: { changes: Number(result.changes) }, results: [] } as unknown as D1Result<T>;
    }); },
    first<T = Record<string, unknown>>() { return Promise.resolve().then(() => {
          return (sqlite.prepare(sql).get(...values as never[]) ?? null) as T | null;
    }); },
    all<T = Record<string, unknown>>() { return Promise.resolve().then(() => {
          return { success: true, meta: {}, results: sqlite.prepare(sql).all(...values as never[]) as T[] } as unknown as D1Result<T>;
    }); },
    raw<T = unknown[]>() { return Promise.resolve().then(() => {
          return sqlite.prepare(sql).all(...values as never[]).map(row => Object.values(row)) as T[];
    }); },
  } as D1PreparedStatement);

  return {
    sqlite,
    db: {
      prepare,
      dump() { return Promise.resolve().then(() => { return new ArrayBuffer(0);
      }); },
      async batch<T = unknown>(statements: D1PreparedStatement[]) {
        const prior=previousBatch;
        let release!:()=>void;
        previousBatch=new Promise<void>(resolve=>{release=resolve;});
        await prior;
        sqlite.exec("BEGIN");
        try { const results=[]; for(const statement of statements) results.push(await statement.run<T>()); sqlite.exec("COMMIT"); return results; }
        catch(error) { sqlite.exec("ROLLBACK"); throw error; }
        finally {release();}
      },
      exec: (sql: string) => { return Promise.resolve().then(() => {
              sqlite.exec(sql);
              return { count: 0, duration: 0 };
      }); },
      withSession: () => { throw new Error("not implemented in test adapter"); },
    },
  };
}

export class MemoryKV {
  readonly values = new Map<string, string>();
  readonly deleted: string[] = [];

  get(key: string): Promise<string | null> { return Promise.resolve().then(() => {
      return this.values.get(key) ?? null;
  }); }

  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream): Promise<void> { return Promise.resolve().then(() => {
      if (typeof value !== "string") throw new Error("The KV fixture accepts text only");
      this.values.set(key, value);
  }); }

  delete(key: string): Promise<void> { return Promise.resolve().then(() => {
      this.deleted.push(key);
      this.values.delete(key);
  }); }
}
