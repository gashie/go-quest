package content

// GetExplanation returns the "Learn" tab explanation for a lesson.
func GetExplanation(slug string) string {
	if exp, ok := explanationRegistry[slug]; ok {
		return exp
	}
	return "Explanation coming soon! Compare the Node.js and Go code side by side."
}

// GetTeacherTips returns classroom-style callouts from the teacher character.
func GetTeacherTips(slug string) []TeacherTip {
	if t, ok := tipRegistry[slug]; ok {
		return t
	}
	return nil
}

// GetAnnotations returns line-by-line comparison notes for the "Compare" tab.
func GetAnnotations(slug string) []Annotation {
	if ann, ok := annotationRegistry[slug]; ok {
		return ann
	}
	return nil
}

// GetChallenge returns the interactive challenge for a lesson.
func GetChallenge(slug string) Challenge {
	if ch, ok := challengeRegistry[slug]; ok {
		return ch
	}
	return Challenge{}
}

// GetTestCases returns automated test cases for the "Test" tab.
func GetTestCases(slug string) []TestCase {
	if tc, ok := testRegistry[slug]; ok {
		return tc
	}
	return nil
}
