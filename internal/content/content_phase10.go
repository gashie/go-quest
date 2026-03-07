package content

func init() {
	registerExplanations(map[string]string{
		"proj_db_connect": "## Connecting to PostgreSQL\n\nJS: `const { Pool } = require('pg')`\nGo: `database/sql` + `lib/pq` driver\n\n```go\nimport (\n    \"database/sql\"\n    _ \"github.com/lib/pq\"\n)\n\ndb, err := sql.Open(\"postgres\",\n    \"host=localhost port=5432 user=app dbname=mydb sslmode=disable\")\nif err != nil {\n    log.Fatal(err)\n}\ndefer db.Close()\n\n// Verify connection\nif err := db.Ping(); err != nil {\n    log.Fatal(err)\n}\n```\n\n`sql.Open` doesn't actually connect — `db.Ping()` verifies the connection.",

		"proj_db_queries": "## SQL Queries in Go\n\nGo's database/sql uses parameterized queries (no SQL injection!):\n\n```go\n// Single row\nvar name string\nerr := db.QueryRow(\"SELECT name FROM users WHERE id = $1\", id).Scan(&name)\n\n// Multiple rows\nrows, _ := db.Query(\"SELECT id, name FROM users\")\ndefer rows.Close()\nfor rows.Next() {\n    var id int\n    var name string\n    rows.Scan(&id, &name)\n}\n\n// Insert/Update/Delete\nresult, _ := db.Exec(\"INSERT INTO users (name) VALUES ($1)\", \"Alice\")\nid, _ := result.LastInsertId()\n```",

		"proj_db_migrations": "## Database Migrations\n\nManage schema changes with migration files:\n```\nmigrations/\n  001_create_users.up.sql\n  001_create_users.down.sql\n  002_add_email.up.sql\n  002_add_email.down.sql\n```\n\nPopular Go migration tools:\n- `golang-migrate/migrate` — CLI and library\n- `pressly/goose` — simple and effective\n\n```go\n// Using golang-migrate\nm, _ := migrate.New(\"file://migrations\", dbURL)\nm.Up()  // apply all pending migrations\n```",

		"proj_db_models": "## Models & Repository Pattern\n\nOrganize database code with the repository pattern:\n```go\ntype User struct {\n    ID    int\n    Name  string\n    Email string\n}\n\ntype UserRepository struct {\n    db *sql.DB\n}\n\nfunc (r *UserRepository) FindByID(id int) (*User, error) {\n    user := &User{}\n    err := r.db.QueryRow(\n        \"SELECT id, name, email FROM users WHERE id = $1\", id,\n    ).Scan(&user.ID, &user.Name, &user.Email)\n    return user, err\n}\n\nfunc (r *UserRepository) Create(u *User) error {\n    _, err := r.db.Exec(\n        \"INSERT INTO users (name, email) VALUES ($1, $2)\",\n        u.Name, u.Email,\n    )\n    return err\n}\n```",

		"proj_db_transactions": "## Transactions & Error Handling\n\nWrap multiple operations in a transaction:\n```go\ntx, err := db.Begin()\nif err != nil {\n    return err\n}\n// Rollback on error\ndefer tx.Rollback()\n\n_, err = tx.Exec(\"INSERT INTO orders ...\")\nif err != nil {\n    return err  // Rollback runs via defer\n}\n_, err = tx.Exec(\"UPDATE inventory ...\")\nif err != nil {\n    return err\n}\n\n// Success — commit\nreturn tx.Commit()\n```\n\nThe `defer tx.Rollback()` pattern ensures rollback on any error. Commit overrides it on success.",

		"proj_db_crud_api": "## CRUD API with Real Database\n\nCombine everything: HTTP handlers + repository + database:\n```go\nfunc (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {\n    var input CreateUserInput\n    json.NewDecoder(r.Body).Decode(&input)\n\n    user := &User{Name: input.Name, Email: input.Email}\n    if err := s.userRepo.Create(user); err != nil {\n        http.Error(w, \"db error\", 500)\n        return\n    }\n\n    w.Header().Set(\"Content-Type\", \"application/json\")\n    w.WriteHeader(http.StatusCreated)\n    json.NewEncoder(w).Encode(user)\n}\n```",
	})

	registerTips(map[string][]TeacherTip{
		"proj_db_connect": {
			{Type: "gotcha", Title: "sql.Open doesn't connect!",
				Content: "sql.Open() only validates the DSN string.\nCall db.Ping() to actually connect and verify.\n\nAlso: db.SetMaxOpenConns() to control connection pool size."},
		},
		"proj_db_queries": {
			{Type: "remember", Title: "Always use parameterized queries!",
				Content: "NEVER concatenate user input into SQL:\n\n// WRONG: SQL injection!\ndb.Query(\"SELECT * WHERE name='\" + name + \"'\")\n\n// RIGHT: parameterized\ndb.Query(\"SELECT * WHERE name=$1\", name)"},
			{Type: "gotcha", Title: "Always defer rows.Close()!",
				Content: "Forgetting rows.Close() leaks database connections.\n\nrows, _ := db.Query(...)\ndefer rows.Close()  // ALWAYS!"},
		},
		"proj_db_transactions": {
			{Type: "protip", Title: "defer Rollback is safe",
				Content: "defer tx.Rollback() is safe even after Commit().\nRollback after Commit is a no-op.\n\nThis pattern ensures cleanup on any error path."},
		},
	})
}
