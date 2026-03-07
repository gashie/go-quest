package content

// PhaseDefinition is a static definition used to build the curriculum
type PhaseDefinition struct {
	Name        string
	Slug        string
	Level       string
	Description string
	XPRequired  int
	LessonSlugs []LessonDef
}

// LessonDef maps a file slug to lesson metadata
type LessonDef struct {
	Slug     string
	Title    string
	XP       int
	Playable bool // can run on Go Playground
	Project  bool // project-based (no example file, custom content only)
}

// CurriculumDef returns the static curriculum structure mapping all 64 lessons to 8 phases
func CurriculumDef() []PhaseDefinition {
	return []PhaseDefinition{
		{
			Name: "Foundations", Slug: "foundations", Level: "Beginner",
			Description: "Core syntax you already know from Node.js, now in Go.",
			XPRequired:  0,
			LessonSlugs: []LessonDef{
				{Slug: "print", Title: "Print & Console Output", XP: 10, Playable: true},
				{Slug: "comments", Title: "Comments", XP: 10, Playable: true},
				{Slug: "variables", Title: "Variables & Constants", XP: 15, Playable: true},
				{Slug: "types", Title: "Types", XP: 15, Playable: true},
				{Slug: "interpolation", Title: "String Interpolation", XP: 10, Playable: true},
				{Slug: "ifelse", Title: "If/Else Conditionals", XP: 15, Playable: true},
				{Slug: "switch", Title: "Switch Statements", XP: 15, Playable: true},
				{Slug: "for_loop", Title: "For Loops", XP: 15, Playable: true},
				{Slug: "while_loop", Title: "While Loops (Go-style)", XP: 15, Playable: true},
				{Slug: "functions", Title: "Functions", XP: 20, Playable: true},
				{Slug: "default_values", Title: "Default Values", XP: 15, Playable: true},
				{Slug: "iife", Title: "Immediately Invoked Functions", XP: 10, Playable: true},
			},
		},
		{
			Name: "Data Structures", Slug: "data-structures", Level: "Beginner",
			Description: "Arrays, maps, structs, and how they differ from JS objects.",
			XPRequired:  100,
			LessonSlugs: []LessonDef{
				{Slug: "arrays", Title: "Arrays & Slices", XP: 20, Playable: true},
				{Slug: "array_iteration", Title: "Array Iteration", XP: 15, Playable: true},
				{Slug: "array_sort", Title: "Sorting Arrays", XP: 15, Playable: true},
				{Slug: "maps", Title: "Maps (Objects in JS)", XP: 20, Playable: true},
				{Slug: "objects", Title: "Structs as Objects", XP: 20, Playable: true},
				{Slug: "destructuring", Title: "Destructuring", XP: 15, Playable: true},
				{Slug: "spread", Title: "Spread Operator", XP: 15, Playable: true},
				{Slug: "rest", Title: "Rest Parameters (Variadic)", XP: 15, Playable: true},
				{Slug: "swapping", Title: "Variable Swapping", XP: 10, Playable: true},
				{Slug: "uint8_arrays", Title: "Byte Slices (Uint8Array)", XP: 15, Playable: true},
				{Slug: "big_numbers", Title: "Big Numbers", XP: 10, Playable: true},
				{Slug: "buffers", Title: "Buffers", XP: 15, Playable: true},
			},
		},
		{
			Name: "Error Handling", Slug: "error-handling", Level: "Intermediate",
			Description: "Go's explicit error handling vs JavaScript exceptions.",
			XPRequired:  250,
			LessonSlugs: []LessonDef{
				{Slug: "errors", Title: "Creating Errors", XP: 20, Playable: true},
				{Slug: "try_catch", Title: "Try/Catch vs Defer/Recover", XP: 25, Playable: true},
				{Slug: "exceptions", Title: "Panic & Recover", XP: 25, Playable: true},
				{Slug: "type_check", Title: "Type Checking", XP: 20, Playable: true},
				{Slug: "stack_trace", Title: "Stack Traces", XP: 15, Playable: true},
			},
		},
		{
			Name: "Modules & OOP", Slug: "modules-oop", Level: "Intermediate",
			Description: "Go packages, exports, and struct methods vs JS classes.",
			XPRequired:  400,
			LessonSlugs: []LessonDef{
				{Slug: "module_import", Title: "Importing Modules", XP: 20, Playable: true},
				{Slug: "module_export", Title: "Exporting from Modules", XP: 20, Playable: true},
				{Slug: "module_export_usage", Title: "Using Exported Modules", XP: 15, Playable: true},
				{Slug: "class", Title: "Classes vs Structs", XP: 25, Playable: true},
				{Slug: "documentation", Title: "Documentation Comments", XP: 10, Playable: true},
			},
		},
		{
			Name: "I/O & System", Slug: "io-system", Level: "Intermediate",
			Description: "Reading input, files, streams, and system interaction.",
			XPRequired:  550,
			LessonSlugs: []LessonDef{
				{Slug: "stdout", Title: "Standard Output", XP: 10, Playable: true},
				{Slug: "stderr", Title: "Standard Error", XP: 10, Playable: true},
				{Slug: "stdin", Title: "Standard Input", XP: 20, Playable: false},
				{Slug: "files", Title: "File Operations", XP: 25, Playable: false},
				{Slug: "streams", Title: "Streams", XP: 20, Playable: false},
				{Slug: "cli_args", Title: "CLI Arguments", XP: 15, Playable: false},
				{Slug: "cli_flags", Title: "CLI Flags", XP: 15, Playable: false},
				{Slug: "env_vars", Title: "Environment Variables", XP: 15, Playable: false},
				{Slug: "exec", Title: "Executing Commands", XP: 20, Playable: false},
				{Slug: "exec_sync", Title: "Synchronous Exec", XP: 15, Playable: false},
			},
		},
		{
			Name: "Async & Concurrency", Slug: "async-concurrency", Level: "Advanced",
			Description: "Goroutines and channels vs async/await and Promises.",
			XPRequired:  750,
			LessonSlugs: []LessonDef{
				{Slug: "promises", Title: "Promises vs Channels", XP: 30, Playable: true},
				{Slug: "async_await", Title: "Async/Await vs Goroutines", XP: 30, Playable: true},
				{Slug: "generators", Title: "Generators vs Channels", XP: 25, Playable: true},
				{Slug: "event_emitter", Title: "Event Emitter Pattern", XP: 25, Playable: true},
				{Slug: "timeout", Title: "Timeouts", XP: 15, Playable: true},
				{Slug: "interval", Title: "Intervals (Tickers)", XP: 15, Playable: true},
			},
		},
		{
			Name: "Networking", Slug: "networking", Level: "Advanced",
			Description: "HTTP servers, TCP/UDP, and network utilities.",
			XPRequired:  950,
			LessonSlugs: []LessonDef{
				{Slug: "http_server", Title: "HTTP Server", XP: 30, Playable: false},
				{Slug: "json", Title: "JSON Encoding/Decoding", XP: 20, Playable: true},
				{Slug: "url_parse", Title: "URL Parsing", XP: 15, Playable: true},
				{Slug: "tcp_server", Title: "TCP Server", XP: 25, Playable: false},
				{Slug: "udp_server", Title: "UDP Server", XP: 25, Playable: false},
				{Slug: "dns", Title: "DNS Lookup", XP: 15, Playable: false},
			},
		},
		{
			Name: "Advanced Topics", Slug: "advanced", Level: "Advanced",
			Description: "Logging, regex, crypto, compression, databases, and testing.",
			XPRequired:  1150,
			LessonSlugs: []LessonDef{
				{Slug: "logging", Title: "Logging", XP: 15, Playable: true},
				{Slug: "regex", Title: "Regular Expressions", XP: 20, Playable: true},
				{Slug: "crypto", Title: "Cryptography", XP: 20, Playable: true},
				{Slug: "gzip", Title: "Gzip Compression", XP: 15, Playable: true},
				{Slug: "datetime", Title: "Date & Time", XP: 15, Playable: true},
				{Slug: "db_sqlite3", Title: "SQLite Database", XP: 25, Playable: false},
				{Slug: "benchmark_test", Title: "Benchmarking", XP: 20, Playable: false},
				{Slug: "example_test", Title: "Example-Based Testing", XP: 20, Playable: false},
			},
		},
		// ---- ADVANCED PROJECT PHASES ----
		{
			Name: "Building REST APIs", Slug: "rest-apis", Level: "Advanced",
			Description: "Build production REST APIs with Go's standard library and popular routers.",
			XPRequired:  1400,
			LessonSlugs: []LessonDef{
				{Slug: "proj_hello_api", Title: "Your First API Endpoint", XP: 30, Playable: false, Project: true},
				{Slug: "proj_json_api", Title: "JSON Request & Response", XP: 30, Playable: false, Project: true},
				{Slug: "proj_routing", Title: "URL Routing & Path Params", XP: 30, Playable: false, Project: true},
				{Slug: "proj_middleware", Title: "Middleware (Logging, CORS, Auth)", XP: 35, Playable: false, Project: true},
				{Slug: "proj_validation", Title: "Input Validation & Error Responses", XP: 30, Playable: false, Project: true},
				{Slug: "proj_crud", Title: "Full CRUD API (In-Memory)", XP: 40, Playable: false, Project: true},
			},
		},
		{
			Name: "Databases & Storage", Slug: "databases", Level: "Advanced",
			Description: "Connect to real databases, write queries, and manage data.",
			XPRequired:  1700,
			LessonSlugs: []LessonDef{
				{Slug: "proj_db_connect", Title: "Connecting to PostgreSQL", XP: 30, Playable: false, Project: true},
				{Slug: "proj_db_queries", Title: "SQL Queries in Go", XP: 30, Playable: false, Project: true},
				{Slug: "proj_db_migrations", Title: "Database Migrations", XP: 30, Playable: false, Project: true},
				{Slug: "proj_db_models", Title: "Models & Repository Pattern", XP: 35, Playable: false, Project: true},
				{Slug: "proj_db_transactions", Title: "Transactions & Error Handling", XP: 35, Playable: false, Project: true},
				{Slug: "proj_db_crud_api", Title: "CRUD API with Real Database", XP: 40, Playable: false, Project: true},
			},
		},
		{
			Name: "Authentication & Security", Slug: "auth-security", Level: "Expert",
			Description: "JWT auth, password hashing, secure middleware, and protected routes.",
			XPRequired:  2050,
			LessonSlugs: []LessonDef{
				{Slug: "proj_password_hash", Title: "Password Hashing (bcrypt)", XP: 30, Playable: false, Project: true},
				{Slug: "proj_jwt", Title: "JWT Tokens (Sign & Verify)", XP: 35, Playable: false, Project: true},
				{Slug: "proj_auth_middleware", Title: "Auth Middleware", XP: 35, Playable: false, Project: true},
				{Slug: "proj_signup_login", Title: "Signup & Login Endpoints", XP: 40, Playable: false, Project: true},
				{Slug: "proj_protected_routes", Title: "Protected Routes & RBAC", XP: 35, Playable: false, Project: true},
			},
		},
		{
			Name: "Production & Deployment", Slug: "production", Level: "Expert",
			Description: "Docker, config management, graceful shutdown, and real-world deployment.",
			XPRequired:  2400,
			LessonSlugs: []LessonDef{
				{Slug: "proj_config", Title: "Config & Environment Management", XP: 30, Playable: false, Project: true},
				{Slug: "proj_structured_logging", Title: "Structured Logging (slog)", XP: 30, Playable: false, Project: true},
				{Slug: "proj_graceful_shutdown", Title: "Graceful Shutdown", XP: 30, Playable: false, Project: true},
				{Slug: "proj_testing", Title: "Unit & Integration Testing", XP: 35, Playable: false, Project: true},
				{Slug: "proj_docker", Title: "Dockerizing Your Go App", XP: 35, Playable: false, Project: true},
				{Slug: "proj_full_api", Title: "Full Production API Project", XP: 50, Playable: false, Project: true},
			},
		},
	}
}
