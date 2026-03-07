package content

func init() {
	registerExplanations(map[string]string{
		"proj_password_hash": "## Password Hashing with bcrypt\n\nNever store plain passwords! Use bcrypt:\n\n```go\nimport \"golang.org/x/crypto/bcrypt\"\n\n// Hash a password\nhash, err := bcrypt.GenerateFromPassword(\n    []byte(password), bcrypt.DefaultCost)\n\n// Verify password\nerr := bcrypt.CompareHashAndPassword(hash, []byte(password))\nif err != nil {\n    // password doesn't match\n}\n```\n\nSame approach as Node's `bcryptjs` package, but from Go's extended standard library.",

		"proj_jwt": "## JWT Tokens: Sign & Verify\n\nCreate and verify JWTs for stateless authentication:\n\n```go\nimport \"github.com/golang-jwt/jwt/v5\"\n\n// Create token\ntoken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{\n    \"user_id\": 123,\n    \"exp\":     time.Now().Add(24 * time.Hour).Unix(),\n})\ntokenString, _ := token.SignedString([]byte(secretKey))\n\n// Verify token\ntoken, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {\n    return []byte(secretKey), nil\n})\nclaims := token.Claims.(jwt.MapClaims)\nuserID := claims[\"user_id\"]\n```",

		"proj_auth_middleware": "## Auth Middleware\n\nProtect routes by checking JWT in the Authorization header:\n\n```go\nfunc authMiddleware(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        tokenStr := r.Header.Get(\"Authorization\")\n        if tokenStr == \"\" {\n            http.Error(w, \"unauthorized\", 401)\n            return\n        }\n        // Strip \"Bearer \" prefix\n        tokenStr = strings.TrimPrefix(tokenStr, \"Bearer \")\n\n        token, err := jwt.Parse(tokenStr, keyFunc)\n        if err != nil {\n            http.Error(w, \"invalid token\", 401)\n            return\n        }\n\n        // Store user in context\n        ctx := context.WithValue(r.Context(), \"user\", token.Claims)\n        next.ServeHTTP(w, r.WithContext(ctx))\n    })\n}\n```",

		"proj_signup_login": "## Signup & Login Endpoints\n\nComplete auth flow:\n```go\n// POST /api/signup\nfunc signup(w http.ResponseWriter, r *http.Request) {\n    var input struct {\n        Email    string `json:\"email\"`\n        Password string `json:\"password\"`\n    }\n    json.NewDecoder(r.Body).Decode(&input)\n\n    hash, _ := bcrypt.GenerateFromPassword(\n        []byte(input.Password), bcrypt.DefaultCost)\n\n    // Save user with hashed password\n    db.Exec(\"INSERT INTO users (email, password) VALUES ($1, $2)\",\n        input.Email, string(hash))\n}\n\n// POST /api/login\nfunc login(w http.ResponseWriter, r *http.Request) {\n    // 1. Find user by email\n    // 2. bcrypt.CompareHashAndPassword\n    // 3. Generate JWT\n    // 4. Return token\n}\n```",

		"proj_protected_routes": "## Protected Routes & RBAC\n\nRole-Based Access Control:\n```go\nfunc requireRole(role string, next http.HandlerFunc) http.HandlerFunc {\n    return func(w http.ResponseWriter, r *http.Request) {\n        claims := r.Context().Value(\"user\").(jwt.MapClaims)\n        userRole := claims[\"role\"].(string)\n        if userRole != role {\n            http.Error(w, \"forbidden\", 403)\n            return\n        }\n        next(w, r)\n    }\n}\n\n// Usage\nhttp.HandleFunc(\"DELETE /api/users/{id}\",\n    requireRole(\"admin\", deleteUser))\n```\n\nCombine middleware for authentication + authorization.",
	})

	registerTips(map[string][]TeacherTip{
		"proj_password_hash": {
			{Type: "warning", Title: "NEVER store plain passwords!",
				Content: "Always hash with bcrypt (or argon2):\n\nhash, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)\n\nbcrypt.DefaultCost = 10 (about 100ms per hash)."},
		},
		"proj_jwt": {
			{Type: "remember", Title: "Always set token expiration!",
				Content: "\"exp\": time.Now().Add(24 * time.Hour).Unix()\n\nWithout expiration, tokens are valid forever.\nUse short-lived access tokens + refresh tokens in production."},
			{Type: "gotcha", Title: "Keep your secret key SECRET!",
				Content: "Store the JWT secret in environment variables, not in code:\n\nsecret := os.Getenv(\"JWT_SECRET\")"},
		},
		"proj_auth_middleware": {
			{Type: "protip", Title: "Use context to pass user data",
				Content: "ctx := context.WithValue(r.Context(), \"user\", claims)\nnext.ServeHTTP(w, r.WithContext(ctx))\n\n// In handler:\nclaims := r.Context().Value(\"user\")"},
		},
	})
}
