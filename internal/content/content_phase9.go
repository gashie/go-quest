package content

func init() {
	registerExplanations(map[string]string{
		"proj_hello_api": "## Your First API Endpoint\n\nLet's build a REST API from scratch! In Express:\n```js\napp.get('/api/hello', (req, res) => {\n    res.json({ message: 'Hello, World!' });\n});\n```\n\nIn Go (1.22+):\n```go\nhttp.HandleFunc(\"GET /api/hello\", func(w http.ResponseWriter, r *http.Request) {\n    w.Header().Set(\"Content-Type\", \"application/json\")\n    json.NewEncoder(w).Encode(map[string]string{\n        \"message\": \"Hello, World!\",\n    })\n})\nhttp.ListenAndServe(\":8080\", nil)\n```\n\nNo Express, no framework — just the standard library!",

		"proj_json_api": "## JSON Request & Response\n\nHandling JSON in Go API endpoints:\n```go\n// Read JSON from request body\nvar input struct {\n    Name string `json:\"name\"`\n}\njson.NewDecoder(r.Body).Decode(&input)\n\n// Write JSON response\nw.Header().Set(\"Content-Type\", \"application/json\")\njson.NewEncoder(w).Encode(map[string]string{\n    \"greeting\": \"Hello, \" + input.Name,\n})\n```\n\n**json.NewDecoder** reads from any io.Reader (request body).\n**json.NewEncoder** writes to any io.Writer (response writer).",

		"proj_routing": "## URL Routing & Path Parameters\n\nGo 1.22 added built-in path parameters:\n```go\nhttp.HandleFunc(\"GET /api/users/{id}\", func(w http.ResponseWriter, r *http.Request) {\n    id := r.PathValue(\"id\")\n    // fetch user by id\n})\n\nhttp.HandleFunc(\"GET /api/posts/{slug}\", handlePost)\nhttp.HandleFunc(\"DELETE /api/users/{id}\", handleDeleteUser)\n```\n\n**Express equivalent:**\n```js\napp.get('/api/users/:id', (req, res) => {\n    const id = req.params.id;\n});\n```\n\nMethod + path patterns = no router library needed!",

		"proj_middleware": "## Middleware: Logging, CORS, Auth\n\nExpress middleware: `app.use(middleware)`\nGo middleware: function that wraps a handler.\n\n```go\nfunc loggingMiddleware(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        log.Printf(\"%s %s\", r.Method, r.URL.Path)\n        next.ServeHTTP(w, r)  // call the next handler\n    })\n}\n\n// Apply\nhandler := loggingMiddleware(http.DefaultServeMux)\nhttp.ListenAndServe(\":8080\", handler)\n```\n\nMiddleware is just functions wrapping functions — clean and composable!",

		"proj_validation": "## Input Validation & Error Responses\n\nAlways validate user input and return proper error responses:\n```go\nfunc createUser(w http.ResponseWriter, r *http.Request) {\n    var input struct {\n        Name  string `json:\"name\"`\n        Email string `json:\"email\"`\n    }\n    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {\n        http.Error(w, \"invalid JSON\", http.StatusBadRequest)\n        return\n    }\n    if input.Name == \"\" {\n        http.Error(w, \"name is required\", http.StatusBadRequest)\n        return\n    }\n    // proceed with valid input\n}\n```\n\nUse `http.StatusBadRequest` (400), `http.StatusNotFound` (404), etc.",

		"proj_crud": "## Full CRUD API (In-Memory)\n\nBuild a complete Create-Read-Update-Delete API:\n```go\nvar users = map[string]User{}\nvar mu sync.Mutex  // protect concurrent access\n\nhttp.HandleFunc(\"POST /api/users\", createUser)\nhttp.HandleFunc(\"GET /api/users\", listUsers)\nhttp.HandleFunc(\"GET /api/users/{id}\", getUser)\nhttp.HandleFunc(\"PUT /api/users/{id}\", updateUser)\nhttp.HandleFunc(\"DELETE /api/users/{id}\", deleteUser)\n```\n\nUse a `sync.Mutex` to protect the in-memory map from concurrent goroutine access.\n\n**Express equivalent:** Same 5 routes with `app.post`, `app.get`, `app.put`, `app.delete`.",
	})

	registerTips(map[string][]TeacherTip{
		"proj_hello_api": {
			{Type: "protip", Title: "json.NewEncoder vs json.Marshal",
				Content: "json.NewEncoder(w).Encode(data)  // streams directly to writer\njson.Marshal(data) then w.Write   // creates []byte first\n\nNewEncoder is more efficient for HTTP responses."},
		},
		"proj_json_api": {
			{Type: "gotcha", Title: "Always set Content-Type!",
				Content: "w.Header().Set(\"Content-Type\", \"application/json\")\n\nSet headers BEFORE writing the body! Once you call w.Write(), headers are sent."},
			{Type: "remember", Title: "Decode reads the body once",
				Content: "r.Body is an io.ReadCloser — you can only read it once.\n\nIf you need to read it twice, read into a buffer first."},
		},
		"proj_routing": {
			{Type: "protip", Title: "Go 1.22+ pattern matching",
				Content: "Method matching:\n\"GET /api/users\"        // GET only\n\"POST /api/users\"       // POST only\n\nPath params:\n\"GET /api/users/{id}\"   // r.PathValue(\"id\")\n\"GET /files/{path...}\"  // catch-all"},
		},
		"proj_middleware": {
			{Type: "remember", Title: "Middleware pattern",
				Content: "func middleware(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w, r) {\n        // before\n        next.ServeHTTP(w, r)\n        // after\n    })\n}\n\nChain: middleware1(middleware2(handler))"},
		},
		"proj_crud": {
			{Type: "gotcha", Title: "Maps need mutex for concurrency!",
				Content: "HTTP handlers run in goroutines. A shared map needs locking:\n\nvar mu sync.Mutex\nmu.Lock()\nusers[id] = user\nmu.Unlock()\n\nOr use sync.RWMutex for better read performance."},
		},
	})
}
