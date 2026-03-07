package content

func init() {
	registerExplanations(map[string]string{
		"print": `## From console.log() to fmt.Println()

In Node.js, you use **console.log()** for everything. In Go, the **fmt** package handles all output.

**Key differences:**
- Go requires ` + "`import \"fmt\"`" + ` at the top
- ` + "`fmt.Println()`" + ` adds a newline automatically (like console.log)
- ` + "`fmt.Printf()`" + ` uses **format verbs** like %s, %d, %v instead of template literals
- To print to stderr: ` + "`fmt.Fprintf(os.Stderr, ...)`" + ` instead of console.error()
- Every Go file starts with ` + "`package main`" + ` and needs a ` + "`func main()`" + ``,

		"comments": `## Comments: Almost Identical

Good news — comments work the same way!

- ` + "`//`" + ` for single-line comments (same as JS)
- ` + "`/* */`" + ` for multi-line comments (same as JS)
- Go has a convention: comments on exported functions start with the function name`,

		"variables": `## From var/let/const to Go's Variables

In Node.js you have **var**, **let**, and **const**. Go has its own system:

- ` + "`var x string = \"hello\"`" + ` — explicit type declaration
- ` + "`x := \"hello\"`" + ` — shorthand with type inference (most common!)
- ` + "`const x = \"hello\"`" + ` — constants (like JS const, but truly immutable)

**Big difference:** Go is **statically typed**. Once a variable has a type, it can't change.
**Huge difference:** **Unused variables cause a compile error** in Go! Use ` + "`_`" + ` to discard.`,

		"types": `## Static Types vs Dynamic Types

This is the **biggest mental shift** from Node.js. In JS, a variable can hold anything:
` + "```js\nlet x = 5;      // number\nx = \"hello\";    // now it's a string — JS doesn't care\n```" + `

In Go, types are **fixed at declaration**:
` + "```go\nvar x int = 5\nx = \"hello\"    // COMPILE ERROR: cannot use string as int\n```" + `

**Go's basic types:** bool, string, int, int8/16/32/64, float32/64, byte, rune`,

		"interpolation": "## Template Literals → fmt.Sprintf\n\nNode.js template literals are elegant:\n```js\nconst name = \"World\";\nconsole.log(`Hello, ${name}!`);\n```\n\nGo uses **fmt.Sprintf** with format verbs:\n```go\nname := \"World\"\nfmt.Printf(\"Hello, %s!\\n\", name)\n```\n\n**Common format verbs:** %s (string), %d (integer), %f (float), %v (any value), %T (type name)",

		"ifelse": `## If/Else: Almost the Same, But Better

Go's if/else looks familiar but has two differences:

1. **No parentheses** around the condition: ` + "`if x > 5 {`" + ` not ` + "`if (x > 5) {`" + `
2. **Init statement**: you can declare a variable right in the if:
` + "```go\nif err := doSomething(); err != nil {\n    // handle error\n}\n// err doesn't exist out here!\n```" + `

This pattern is **everywhere** in Go. You'll see ` + "`if err != nil`" + ` hundreds of times.`,

		"switch": `## Switch: No Break Needed!

In JS, forgetting ` + "`break`" + ` causes fall-through bugs. Go fixed this:

- **No break needed** — Go stops after the first matching case automatically
- Use ` + "`fallthrough`" + ` keyword if you actually want fall-through (rare)
- Switch can work **without a condition** (acts like if/else chain)
- Cases can have **multiple values**: ` + "`case 1, 2, 3:`" + ``,

		"for_loop": `## The Only Loop: for

Node.js has for, while, do-while, for-of, for-in, forEach...

Go has **one loop: for**. It does everything:

- Classic: ` + "`for i := 0; i < 10; i++ { }`" + `
- While-style: ` + "`for condition { }`" + `
- Infinite: ` + "`for { }`" + `
- Range (like for-of): ` + "`for i, v := range slice { }`" + `

Less to remember, more consistent.`,

		"while_loop": `## While Loop = Just "for"

There is no ` + "`while`" + ` keyword in Go. You use ` + "`for`" + ` without the init and post statements:

` + "```go\n// This IS your while loop\nfor i < 10 {\n    i++\n}\n```" + `

Simple and clean. One keyword for all loops.`,

		"functions": `## Functions: Multiple Return Values!

Go functions look similar to JS, but with a superpower — **multiple return values**:

` + "```go\nfunc divide(a, b float64) (float64, error) {\n    if b == 0 {\n        return 0, errors.New(\"division by zero\")\n    }\n    return a / b, nil\n}\n```" + `

This is how Go handles errors — no try/catch, just return the error as a second value.

**Other differences:**
- Types come **after** parameter names: ` + "`func add(a int, b int) int`" + `
- No function hoisting — declare before you use
- Functions are first-class (can be passed around, just like JS)`,

		"default_values": `## No Default Parameters!

In JS: ` + "`function greet(name = \"World\") { }`" + `

Go doesn't have default parameters. Instead, you use these patterns:

1. **Variadic arguments**: ` + "`func greet(names ...string) { }`" + `
2. **Options struct**: pass a config object
3. **Multiple functions**: ` + "`Greet()`" + ` and ` + "`GreetWithName(name)`" + `
4. **Zero values**: Go initializes variables to their zero value (0, "", false, nil)`,

		"iife": `## IIFE: Immediately Invoked Functions

In JS, IIFEs create isolated scopes:
` + "```js\n(function() { /* isolated */ })();\n```" + `

Go has the same concept with anonymous functions:
` + "```go\nfunc() {\n    // isolated scope\n}()\n```" + `

In Go, this is mainly used with **goroutines**: ` + "`go func() { ... }()`" + ``,
	})

	registerTips(map[string][]TeacherTip{
		"print": {
			{Type: "gotcha", Title: "fmt.Printf needs format verbs!",
				Content: "Coming from console.log, you might try fmt.Printf(\"hello\"). That works for plain text, but to insert values you MUST use format verbs:\n\n%s = string\n%d = integer\n%f = float\n%v = any value (Go figures it out)\n%T = prints the TYPE of a value\n%t = boolean\n%x = hexadecimal\n\nExample: fmt.Printf(\"Name: %s, Age: %d\\n\", name, age)"},
			{Type: "remember", Title: "Printf does NOT add a newline!",
				Content: "fmt.Println() adds \\n automatically. fmt.Printf() does NOT. You must add \\n yourself, or your next print runs into the same line."},
			{Type: "protip", Title: "Use fmt.Sprintf to build strings",
				Content: "fmt.Sprintf works like Printf but RETURNS a string instead of printing:\n\nmessage := fmt.Sprintf(\"Hello %s, you are %d\", name, age)"},
		},
		"comments": {
			{Type: "protip", Title: "Doc comments = your documentation",
				Content: "Comments before exported functions become official docs. Start with the function name:\n\n// Add returns the sum of a and b.\nfunc Add(a, b int) int { ... }"},
		},
		"variables": {
			{Type: "gotcha", Title: "Unused variables = compile error!",
				Content: "This is the #1 surprise for JS devs. If you declare a variable and don't use it, the code WON'T COMPILE. Use _ to ignore values:\n\nresult, _ := someFunction()"},
			{Type: "remember", Title: ":= only works INSIDE functions",
				Content: "The short declaration := only works inside a function. At package level, use var:\n\nvar GlobalName = \"hello\"  // package level\nfunc main() {\n    localName := \"world\"  // inside function only\n}"},
			{Type: "protip", Title: "Zero values are your friend",
				Content: "Every type has a zero value — no 'undefined' in Go:\n\nint → 0\nstring → \"\" (empty)\nbool → false\npointer/slice/map → nil\n\nvar count int  // count is already 0!"},
		},
		"types": {
			{Type: "gotcha", Title: "Types are FIXED at compile time",
				Content: "In JS: let x = 5; x = 'hello'; // fine!\nIn Go: x := 5; x = \"hello\" // COMPILE ERROR\n\nOnce a variable has a type, it keeps that type forever."},
			{Type: "remember", Title: "int size depends on your system",
				Content: "'int' is 64-bit on 64-bit systems, 32-bit on 32-bit. For specific sizes use int32 or int64."},
		},
		"interpolation": {
			{Type: "gotcha", Title: "No template literals in Go!",
				Content: "There is no ${variable} syntax. You MUST use fmt.Sprintf:\n\nJS:  `Hello ${name}, age ${age}`\nGo:  fmt.Sprintf(\"Hello %s, age %d\", name, age)\n\nVerbs must match types: %s=string, %d=int, %f=float"},
			{Type: "remember", Title: "Format verb cheat sheet",
				Content: "%v = any value (auto-detect)\n%s = string\n%d = integer\n%f = float (default precision)\n%.2f = float with 2 decimals\n%t = boolean\n%T = type name\n%+v = struct with field names\n%#v = Go syntax representation"},
		},
		"ifelse": {
			{Type: "gotcha", Title: "Brace MUST be on the same line!",
				Content: "This is a compile error:\n\nif x > 5\n{    // WRONG! Brace can't go here\n}\n\nThe { must always be on the same line as if/else/for/func."},
			{Type: "protip", Title: "if with init statement is powerful",
				Content: "Declare a variable in the if:\n\nif err := doSomething(); err != nil {\n    // err exists here\n}\n// err is gone here!"},
		},
		"switch": {
			{Type: "remember", Title: "No break needed — ever!",
				Content: "Each case automatically breaks. If you actually WANT fall-through (rare), use the 'fallthrough' keyword explicitly."},
		},
		"for_loop": {
			{Type: "remember", Title: "'for' is the ONLY loop in Go",
				Content: "No while. No do-while. No for-of. Just 'for':\n\nfor i := 0; i < 10; i++ {}  // classic\nfor i < 10 {}                // while\nfor {}                        // infinite\nfor i, v := range slice {}   // for-of"},
			{Type: "gotcha", Title: "range gives INDEX and VALUE",
				Content: "for i, v := range mySlice {}\ni = index, v = value\n\nOnly value: for _, v := range slice {}\nOnly index: for i := range slice {}"},
		},
		"while_loop": {
			{Type: "protip", Title: "break and continue work the same",
				Content: "'break' exits the loop, 'continue' skips to next iteration. Go also supports labeled breaks for nested loops."},
		},
		"functions": {
			{Type: "gotcha", Title: "Multiple return values change everything",
				Content: "This is how Go handles errors — no try/catch!\n\nresult, err := doSomething()\nif err != nil { return err }\n\nYou'll write this pattern thousands of times."},
			{Type: "remember", Title: "Types come AFTER the name",
				Content: "JS: function add(a, b)\nGo: func add(a int, b int) int\n\nShorthand: func add(a, b int) int"},
		},
		"default_values": {
			{Type: "gotcha", Title: "No default parameters in Go!",
				Content: "Workarounds:\n1. Zero values (always valid)\n2. Variadic: func log(msgs ...string)\n3. Options struct\n4. Functional options (advanced)"},
		},
		"iife": {
			{Type: "protip", Title: "IIFEs + goroutines = concurrency",
				Content: "Main use in Go:\n\ngo func() {\n    // runs concurrently\n}()"},
		},
	})

	registerAnnotations(map[string][]Annotation{
		"print": {
			{LineNode: 1, LineGo: 1, Text: "Every Go file starts with a package declaration. 'main' means this is an executable."},
			{LineNode: 1, LineGo: 3, Text: "Go requires explicit imports. The 'fmt' package handles formatted I/O."},
			{LineNode: 1, LineGo: 7, Text: "Entry point must be 'func main()' — like Node running a file directly."},
			{LineNode: 1, LineGo: 8, Text: "fmt.Println() is your console.log(). Adds newline automatically."},
		},
		"variables": {
			{LineNode: 1, LineGo: 7, Text: "'var' declares with explicit type. Like 'let' but typed."},
			{LineNode: 3, LineGo: 9, Text: "':=' is shorthand — declares AND infers type. You'll use this 90% of the time."},
			{LineNode: 5, LineGo: 11, Text: "'const' works similarly but in Go, constants must be compile-time values."},
		},
		"for_loop": {
			{LineNode: 1, LineGo: 8, Text: "Same structure: init; condition; post. But no parentheses in Go."},
		},
		"functions": {
			{LineNode: 1, LineGo: 7, Text: "Parameters have types AFTER the name: 'a int' not 'int a'."},
			{LineNode: 1, LineGo: 7, Text: "Return type comes after the parameters: 'func add(a, b int) int'."},
		},
	})

	registerChallenges(map[string]Challenge{
		"print": {
			Type:   "rewrite",
			Prompt: "Rewrite this Node.js code in Go:\n\nconsole.log('Hello, GoQuest!')\nconsole.log('You have %d lives', 3)",
			StarterCode: `package main

import "fmt"

func main() {
	// Your code here
}`,
			Solution: `package main

import "fmt"

func main() {
	fmt.Println("Hello, GoQuest!")
	fmt.Printf("You have %d lives\n", 3)
}`,
			ExpectedOut: "Hello, GoQuest!\nYou have 3 lives\n",
			Hints:       []string{"Use fmt.Println for simple output", "Use fmt.Printf with %d for integers — don't forget \\n"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"variables": {
			Type:   "fill_blank",
			Prompt: "Fill in the blanks to declare variables in Go.\nReplace ___ with the correct Go keyword.",
			StarterCode: `package main

import "fmt"

func main() {
	___ name string = "GoQuest"
	age ___ 5
	___ isActive = true
	fmt.Println(name, age, isActive)
}`,
			Solution: `package main

import "fmt"

func main() {
	var name string = "GoQuest"
	age := 5
	const isActive = true
	fmt.Println(name, age, isActive)
}`,
			ExpectedOut: "GoQuest 5 true\n",
			Hints:       []string{"Use 'var' for explicit type declarations", "Use ':=' for shorthand with type inference", "Use 'const' for values that never change"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"for_loop": {
			Type:   "build",
			Prompt: "Write a Go program that prints numbers 1 to 10, each on a new line.",
			StarterCode: `package main

import "fmt"

func main() {
	// Write a for loop that prints 1 through 10
}`,
			Solution: `package main

import "fmt"

func main() {
	for i := 1; i <= 10; i++ {
		fmt.Println(i)
	}
}`,
			ExpectedOut: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n",
			Hints:       []string{"Go only has 'for', no 'while'", "Use := to initialize the loop variable"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"ifelse": {
			Type:   "rewrite",
			Prompt: "Rewrite this Node.js code in Go:\n\nconst age = 20;\nif (age >= 18) {\n  console.log('adult');\n} else {\n  console.log('minor');\n}",
			StarterCode: `package main

import "fmt"

func main() {
	// Declare age and use if/else to print "adult" or "minor"
}`,
			Solution: `package main

import "fmt"

func main() {
	age := 20
	if age >= 18 {
		fmt.Println("adult")
	} else {
		fmt.Println("minor")
	}
}`,
			ExpectedOut: "adult\n",
			Hints:       []string{"No parentheses around the condition in Go", "Opening brace { must be on the same line as if/else"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"switch": {
			Type:   "rewrite",
			Prompt: "Rewrite this switch in Go:\n\nconst day = 'monday';\nswitch(day) {\n  case 'monday': console.log('Start of week'); break;\n  case 'friday': console.log('TGIF'); break;\n  default: console.log('Regular day');\n}",
			StarterCode: `package main

import "fmt"

func main() {
	// Write a switch statement for day
}`,
			Solution: `package main

import "fmt"

func main() {
	day := "monday"
	switch day {
	case "monday":
		fmt.Println("Start of week")
	case "friday":
		fmt.Println("TGIF")
	default:
		fmt.Println("Regular day")
	}
}`,
			ExpectedOut: "Start of week\n",
			Hints:       []string{"No break needed in Go — it's automatic", "No parentheses around the switch value"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"functions": {
			Type:   "build",
			Prompt: "Write a Go function called 'add' that takes two integers and returns their sum. Then call it in main with add(3, 5) and print the result.",
			StarterCode: `package main

import "fmt"

// Write your add function here

func main() {
	// Call add(3, 5) and print the result
}`,
			Solution: `package main

import "fmt"

func add(a, b int) int {
	return a + b
}

func main() {
	fmt.Println(add(3, 5))
}`,
			ExpectedOut: "8\n",
			Hints:       []string{"Return type goes after the parameters: func add(a, b int) int", "When parameters share a type, you can write 'a, b int' instead of 'a int, b int'"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"arrays": {
			Type:   "fix_bug",
			Prompt: "This Go code has 2 bugs. Fix them so it compiles and runs correctly.",
			StarterCode: `package main

import "fmt"

func main() {
	numbers := [int]{1, 2, 3, 4, 5}
	fmt.Println(numbers)

	doubled := make([]int, len(numbers)
	for i, v := range numbers {
		doubled[i] = v * 2
	}
	fmt.Println(doubled)
}`,
			Solution: `package main

import "fmt"

func main() {
	numbers := []int{1, 2, 3, 4, 5}
	fmt.Println(numbers)

	doubled := make([]int, len(numbers))
	for i, v := range numbers {
		doubled[i] = v * 2
	}
	fmt.Println(doubled)
}`,
			ExpectedOut: "[1 2 3 4 5]\n[2 4 6 8 10]\n",
			Hints:       []string{"Slice literals use []int not [int]", "Check for missing closing parenthesis"},
			BonusXP:     10,
			BonusCoins:  5,
		},
	})

	registerTests(map[string][]TestCase{
		"print": {
			{Name: "Prints hello message", ExpectedOut: "Hello, GoQuest!\nYou have 3 lives\n"},
		},
		"for_loop": {
			{Name: "Prints 1 to 10", ExpectedOut: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n"},
		},
		"functions": {
			{Name: "add(3, 5) returns 8", ExpectedOut: "8\n"},
			{Name: "add(0, 0) returns 0", ExpectedOut: "0\n", WrapperCode: `func main() { fmt.Println(add(0, 0)) }`},
		},
		"variables": {
			{Name: "Declares and prints variables", ExpectedOut: "GoQuest 5 true\n"},
		},
		"ifelse": {
			{Name: "Prints adult for age 20", ExpectedOut: "adult\n"},
		},
		"switch": {
			{Name: "Prints Start of week", ExpectedOut: "Start of week\n"},
		},
	})
}
