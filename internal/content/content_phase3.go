package content

func init() {
	registerExplanations(map[string]string{
		"errors": "## Creating Errors: errors.New & Custom Types\n\nIn JS: `throw new Error('message')`\nIn Go: errors are just **values** that implement the `error` interface.\n\n```go\n// Simple error\nerr := errors.New(\"something went wrong\")\n\n// Custom error type\ntype NotFoundError struct {\n    ID string\n}\nfunc (e *NotFoundError) Error() string {\n    return \"not found: \" + e.ID\n}\n```\n\nThe `error` interface has just one method: `Error() string`. Any type that implements it IS an error.",

		"try_catch": "## Try/Catch → Return Errors\n\nThis is the **biggest paradigm shift** from JS to Go.\n\nJS wraps risky code in try/catch:\n```js\ntry {\n    const result = riskyOperation();\n} catch(err) {\n    console.error(err);\n}\n```\n\nGo returns errors as values:\n```go\nresult, err := riskyOperation()\nif err != nil {\n    log.Fatal(err)\n}\n```\n\nNo exceptions, no try/catch. Every function that can fail returns an `error` as its last return value. You check it immediately.",

		"exceptions": "## Panic & Recover: Go's Emergency Exit\n\nGo has `panic` for truly exceptional situations (like a bug, not normal errors):\n```go\npanic(\"something impossible happened\")\n```\n\n`recover()` catches panics (like catch for uncaught exceptions):\n```go\ndefer func() {\n    if r := recover(); r != nil {\n        fmt.Println(\"recovered:\", r)\n    }\n}()\n```\n\n**Rule of thumb:** Use error returns for expected failures. Use panic only for programmer bugs or impossible states.",

		"type_check": "## Type Checking: reflect.TypeOf\n\nJS: `typeof x` or `Object.prototype.toString.call(x)`\nGo: `reflect.TypeOf(x)` or type switches:\n\n```go\nswitch v := x.(type) {\ncase int:\n    fmt.Println(\"it's an int:\", v)\ncase string:\n    fmt.Println(\"it's a string:\", v)\ndefault:\n    fmt.Println(\"unknown type\")\n}\n```\n\nType switches are idiomatic Go. `reflect` is powerful but slow — use type switches when possible.",

		"stack_trace": "## Stack Traces: runtime/debug\n\nJS: `console.trace()` or `err.stack`\nGo: `runtime/debug.Stack()` returns the current stack trace as bytes.\n\nUsually used inside `recover()`:\n```go\ndefer func() {\n    if r := recover(); r != nil {\n        fmt.Println(string(debug.Stack()))\n    }\n}()\n```\n\nFor better error context in production, consider the `fmt.Errorf` wrapping pattern:\n```go\nreturn fmt.Errorf(\"loading user %d: %w\", id, err)\n```",
	})

	registerTips(map[string][]TeacherTip{
		"errors": {
			{Type: "remember", Title: "if err != nil — the Go mantra",
				Content: "Errors are values. Every fallible function returns an error:\n\nresult, err := doThing()\nif err != nil { return err }"},
			{Type: "protip", Title: "Wrap errors with context",
				Content: "Don't just return err. Add context:\n\nreturn fmt.Errorf(\"loading user %d: %w\", id, err)\n\nThe %w verb wraps the error so you can unwrap it later with errors.Is() or errors.As()."},
		},
		"try_catch": {
			{Type: "gotcha", Title: "No try/catch in Go!",
				Content: "This is the hardest habit to break from JS.\n\nJS: try { } catch(err) { }\nGo: result, err := fn(); if err != nil { }\n\nEvery function that can fail returns an error. Check it immediately."},
			{Type: "remember", Title: "Always handle errors",
				Content: "Never do: result, _ := riskyFunc()\n\nAlways check:\nresult, err := riskyFunc()\nif err != nil {\n    return err\n}"},
		},
		"exceptions": {
			{Type: "warning", Title: "panic is NOT for normal errors!",
				Content: "Don't use panic like throw in JS.\n\npanic = program BUG, impossible state\nerror return = expected failure\n\nPanic crashes the program unless recovered."},
			{Type: "remember", Title: "defer runs in LIFO order",
				Content: "Deferred functions run when the surrounding function returns, in Last-In-First-Out order.\n\ndefer fmt.Println(\"first\")\ndefer fmt.Println(\"second\")\n// prints: second, then first"},
		},
		"type_check": {
			{Type: "protip", Title: "Type switches are idiomatic",
				Content: "switch v := x.(type) {\ncase int:    // v is int\ncase string: // v is string\n}\n\nPrefer type switches over reflect for known types."},
		},
		"stack_trace": {
			{Type: "protip", Title: "Use %w for error wrapping",
				Content: "fmt.Errorf(\"context: %w\", err) wraps errors.\nerrors.Is(err, target) checks the chain.\nerrors.As(err, &target) extracts typed errors."},
		},
	})

	registerChallenges(map[string]Challenge{
		"errors": {
			Type:        "build",
			Prompt:      "Create a custom error type called DivideError with a message field. Write a divide function that returns this error when dividing by zero. Call divide(10, 0) and print the error.",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Define DivideError and divide function\n\nfunc main() {\n\tresult, err := divide(10, 0)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\ntype DivideError struct {\n\tmessage string\n}\n\nfunc (e *DivideError) Error() string {\n\treturn e.message\n}\n\nfunc divide(a, b float64) (float64, error) {\n\tif b == 0 {\n\t\treturn 0, &DivideError{message: \"cannot divide by zero\"}\n\t}\n\treturn a / b, nil\n}\n\nfunc main() {\n\tresult, err := divide(10, 0)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}",
			ExpectedOut: "cannot divide by zero\n",
			Hints:       []string{"Implement the Error() string method on your struct", "Return 0 and the error when b == 0"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"try_catch": {
			Type:        "rewrite",
			Prompt:      "Rewrite this JS in Go:\nfunction foo(fail) {\n  if (fail) throw Error('my error');\n}\ntry { foo(true); } catch(err) { console.log('caught:', err.message); }",
			StarterCode: "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\n// Write foo that returns error when fail is true\n\nfunc main() {\n\t// Call foo(true) and handle the error\n}",
			Solution:    "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\nfunc foo(fail bool) error {\n\tif fail {\n\t\treturn errors.New(\"my error\")\n\t}\n\treturn nil\n}\n\nfunc main() {\n\terr := foo(true)\n\tif err != nil {\n\t\tfmt.Printf(\"caught: %s\\n\", err.Error())\n\t}\n}",
			ExpectedOut: "caught: my error\n",
			Hints:       []string{"Return errors.New() instead of throwing", "Check err != nil instead of try/catch"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"exceptions": {
			Type:        "build",
			Prompt:      "Write a function that panics with \"oops\". Use defer/recover in main to catch it and print \"recovered: oops\".",
			StarterCode: "package main\n\nimport \"fmt\"\n\nfunc dangerous() {\n\t// panic here\n}\n\nfunc main() {\n\t// defer/recover to catch the panic\n\tdangerous()\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc dangerous() {\n\tpanic(\"oops\")\n}\n\nfunc main() {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tfmt.Printf(\"recovered: %s\\n\", r)\n\t\t}\n\t}()\n\tdangerous()\n}",
			ExpectedOut: "recovered: oops\n",
			Hints:       []string{"Use defer func() { ... }() before the panic call", "recover() returns the value passed to panic()"},
			BonusXP:     15,
			BonusCoins:  8,
		},
		"type_check": {
			Type:        "build",
			Prompt:      "Write a function describe that takes an interface{} and uses a type switch to print the type: \"bool\", \"int\", \"string\", or \"unknown\". Test with true, 42, \"hello\".",
			StarterCode: "package main\n\nimport \"fmt\"\n\nfunc describe(x interface{}) {\n\t// Use type switch\n}\n\nfunc main() {\n\tdescribe(true)\n\tdescribe(42)\n\tdescribe(\"hello\")\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc describe(x interface{}) {\n\tswitch x.(type) {\n\tcase bool:\n\t\tfmt.Println(\"bool\")\n\tcase int:\n\t\tfmt.Println(\"int\")\n\tcase string:\n\t\tfmt.Println(\"string\")\n\tdefault:\n\t\tfmt.Println(\"unknown\")\n\t}\n}\n\nfunc main() {\n\tdescribe(true)\n\tdescribe(42)\n\tdescribe(\"hello\")\n}",
			ExpectedOut: "bool\nint\nstring\n",
			Hints:       []string{"Use switch x.(type) { case int: ... }", "interface{} can hold any value"},
			BonusXP:     10,
			BonusCoins:  5,
		},
	})

	registerTests(map[string][]TestCase{
		"errors": {
			{Name: "Prints error message", ExpectedOut: "cannot divide by zero\n"},
		},
		"try_catch": {
			{Name: "Catches error", ExpectedOut: "caught: my error\n"},
		},
		"exceptions": {
			{Name: "Recovers from panic", ExpectedOut: "recovered: oops\n"},
		},
		"type_check": {
			{Name: "Identifies types", ExpectedOut: "bool\nint\nstring\n"},
		},
	})
}
