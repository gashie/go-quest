package content

func init() {
	registerExplanations(map[string]string{
		"proj_config": "## Config & Environment Management\n\nManage configuration cleanly:\n```go\ntype Config struct {\n    Port      string\n    DBHost    string\n    JWTSecret string\n}\n\nfunc LoadConfig() Config {\n    return Config{\n        Port:      getEnv(\"PORT\", \"8080\"),\n        DBHost:    getEnv(\"DB_HOST\", \"localhost\"),\n        JWTSecret: getEnv(\"JWT_SECRET\", \"\"),\n    }\n}\n\nfunc getEnv(key, fallback string) string {\n    if val, ok := os.LookupEnv(key); ok {\n        return val\n    }\n    return fallback\n}\n```\n\nFor `.env` files, use `github.com/joho/godotenv`.",

		"proj_structured_logging": "## Structured Logging with slog\n\nGo 1.21+ includes `log/slog` for structured logging:\n\n```go\nimport \"log/slog\"\n\n// Text output\nslog.Info(\"user logged in\",\n    \"user_id\", 123,\n    \"ip\", \"192.168.1.1\")\n// Output: level=INFO msg=\"user logged in\" user_id=123 ip=192.168.1.1\n\n// JSON output\nlogger := slog.New(slog.NewJSONHandler(os.Stdout, nil))\nlogger.Info(\"request\", \"method\", \"GET\", \"status\", 200)\n// Output: {\"level\":\"INFO\",\"msg\":\"request\",\"method\":\"GET\",\"status\":200}\n```\n\nLike Winston/Pino in Node.js, but in the standard library!",

		"proj_graceful_shutdown": "## Graceful Shutdown\n\nHandle SIGINT/SIGTERM to finish in-flight requests:\n```go\nsrv := &http.Server{Addr: \":8080\", Handler: mux}\n\n// Start server in goroutine\ngo func() {\n    if err := srv.ListenAndServe(); err != http.ErrServerClosed {\n        log.Fatal(err)\n    }\n}()\n\n// Wait for interrupt signal\nquit := make(chan os.Signal, 1)\nsignal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)\n<-quit\n\n// Graceful shutdown with timeout\nctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)\ndefer cancel()\nsrv.Shutdown(ctx)\n```",

		"proj_testing": "## Unit & Integration Testing\n\nGo's testing is built-in — no Jest needed:\n```go\n// math_test.go\nfunc TestAdd(t *testing.T) {\n    got := Add(2, 3)\n    want := 5\n    if got != want {\n        t.Errorf(\"Add(2,3) = %d, want %d\", got, want)\n    }\n}\n\n// HTTP handler testing\nfunc TestHelloHandler(t *testing.T) {\n    req := httptest.NewRequest(\"GET\", \"/hello\", nil)\n    w := httptest.NewRecorder()\n\n    helloHandler(w, req)\n\n    if w.Code != 200 {\n        t.Errorf(\"got status %d\", w.Code)\n    }\n}\n```\n\nRun: `go test ./...`\nCoverage: `go test -cover ./...`",

		"proj_docker": "## Dockerizing Your Go App\n\nMulti-stage Dockerfile for tiny images:\n```dockerfile\n# Build stage\nFROM golang:1.22-alpine AS builder\nWORKDIR /app\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 go build -o server .\n\n# Run stage\nFROM alpine:latest\nCOPY --from=builder /app/server /server\nEXPOSE 8080\nCMD [\"/server\"]\n```\n\nResult: ~10MB image (vs 1GB+ for Node.js).\nGo compiles to a single static binary — no runtime, no node_modules!",

		"proj_full_api": "## Full Production API Project\n\nPut it all together — a production-ready Go API:\n\n```\nmyapi/\n  cmd/server/main.go       # Entry point\n  internal/\n    config/config.go       # Environment config\n    handler/               # HTTP handlers\n    middleware/             # Auth, logging, CORS\n    model/                 # Data models\n    repository/            # Database access\n    service/               # Business logic\n  migrations/              # SQL migrations\n  Dockerfile\n  docker-compose.yml\n  Makefile\n```\n\n**Key principles:**\n- `cmd/` for entry points\n- `internal/` for private packages\n- Dependency injection via constructors\n- Interfaces for testability\n- Graceful shutdown\n- Structured logging\n- Health check endpoint",
	})

	registerTips(map[string][]TeacherTip{
		"proj_config": {
			{Type: "protip", Title: "12-Factor App: Config in env vars",
				Content: "Never hardcode config. Use environment variables:\n\nos.Getenv(\"PORT\")\nos.Getenv(\"DATABASE_URL\")\nos.Getenv(\"JWT_SECRET\")\n\nUse godotenv for local development .env files."},
		},
		"proj_structured_logging": {
			{Type: "remember", Title: "slog is in the standard library!",
				Content: "No need for logrus, zap, or zerolog anymore (Go 1.21+):\n\nslog.Info(\"msg\", \"key\", value)\nslog.Error(\"failed\", \"error\", err)\nslog.With(\"request_id\", id).Info(\"handled\")"},
		},
		"proj_graceful_shutdown": {
			{Type: "warning", Title: "Always handle shutdown signals!",
				Content: "Without graceful shutdown:\n- In-flight requests get killed\n- DB connections leak\n- Data can be corrupted\n\nAlways listen for SIGINT/SIGTERM in production."},
		},
		"proj_testing": {
			{Type: "protip", Title: "httptest is amazing",
				Content: "Test HTTP handlers without starting a server:\n\nreq := httptest.NewRequest(\"POST\", \"/api\", body)\nw := httptest.NewRecorder()\nhandler(w, req)\n// check w.Code, w.Body"},
			{Type: "remember", Title: "go test ./... runs ALL tests",
				Content: "go test ./...         // all tests\ngo test -v ./...      // verbose\ngo test -cover ./...  // with coverage\ngo test -run TestName // specific test"},
		},
		"proj_docker": {
			{Type: "protip", Title: "Multi-stage = tiny images",
				Content: "Go compiles to a static binary. No runtime needed!\n\nNode.js image: ~1GB (with node_modules)\nGo image: ~10MB (just the binary)\n\nUse FROM scratch for the smallest possible image."},
		},
		"proj_full_api": {
			{Type: "remember", Title: "The cmd/internal pattern",
				Content: "cmd/ = entry points (main.go files)\ninternal/ = private packages (can't be imported by others)\npkg/ = public packages (optional)\n\nThis is the standard Go project layout."},
		},
	})
}
