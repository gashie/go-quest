package content

// Package-level registries for lesson content.
// Content is registered from multiple files via init() functions.

var (
	explanationRegistry = map[string]string{}
	tipRegistry         = map[string][]TeacherTip{}
	annotationRegistry  = map[string][]Annotation{}
	challengeRegistry   = map[string]Challenge{}
	testRegistry        = map[string][]TestCase{}
)

func registerExplanations(m map[string]string) {
	for k, v := range m {
		explanationRegistry[k] = v
	}
}

func registerTips(m map[string][]TeacherTip) {
	for k, v := range m {
		tipRegistry[k] = v
	}
}

func registerAnnotations(m map[string][]Annotation) {
	for k, v := range m {
		annotationRegistry[k] = v
	}
}

func registerChallenges(m map[string]Challenge) {
	for k, v := range m {
		challengeRegistry[k] = v
	}
}

func registerTests(m map[string][]TestCase) {
	for k, v := range m {
		testRegistry[k] = v
	}
}
