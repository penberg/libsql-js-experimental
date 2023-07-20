import test from "ava";

test.beforeEach(async (t) => {
  const db = await connect();
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
  db.exec("INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.org')");
  db.exec("INSERT INTO users (id, name, email) VALUES (2, 'Bob', 'bob@example.com')");
	t.context = {
		db,
	};
});

test("Statement.get()", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  t.is(stmt.get(0), undefined);
  t.is(stmt.get(1).name, "Alice");
  t.is(stmt.get(2).name, "Bob");
});

test("Statement.get() [raw]", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  t.deepEqual(stmt.raw().get(1), [1, "Alice", 'alice@example.org']);
});

test("Statement.iterate() [empty]", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users WHERE id = 0");
  t.is(stmt.iterate().next().done, true);
});

test("Statement.iterate()", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users");
  const expected = [1, 2];
  var idx = 0;
  for (const row of stmt.iterate()) {
    t.is(row.id, expected[idx++]);
  }
});

test("Statement.all()", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users");
  const expected = [
    { id: 1, name: 'Alice', email: 'alice@example.org' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
  t.deepEqual(stmt.all(), expected);
});

test("Statement.all() [raw]", async (t) => {
  const db = t.context.db;

  const stmt = db.prepare("SELECT * FROM users");
  const expected = [
    [ 1, 'Alice', 'alice@example.org' ],
    [ 2, 'Bob', 'bob@example.com' ],
  ];
  t.deepEqual(stmt.raw().all(), expected);
});

test("errors", async (t) => {
  const db = t.context.db;

  const syntax_error = await t.throws(() => {
    db.exec("SYNTAX ERROR")
  });
  t.is(syntax_error.message, 'near "SYNTAX": syntax error');
  const no_such_table_error = await t.throws(() => {
    db.exec("SELECT * FROM missing_table")
  });
  t.is(no_such_table_error.message, 'no such table: missing_table');
});

const connect = async () => {
  const provider = process.env.PROVIDER;
  if (provider === "libsql") {
    const x = await import("libsql-experimental");
    const options = {};
    const db = new x.default(":memory:", options);
    return db;
  }
  if (provider == "sqlite") {
    const x = await import("better-sqlite3");
    const options = {};
    const db = x.default(":memory:", options);
    return db;
  }
  throw new Error("Unknown provider: " + provider);
};