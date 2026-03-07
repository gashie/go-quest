package content

// Phase represents a learning phase (e.g., "Foundations", "Data Structures")
type Phase struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Slug        string   `json:"slug"`
	Level       string   `json:"level"`
	Description string   `json:"description"`
	Lessons     []Lesson `json:"lessons"`
	XPRequired  int      `json:"xpRequired"`
}

// Lesson represents a single learning topic with paired JS/Go code
type Lesson struct {
	ID          int          `json:"id"`
	Slug        string       `json:"slug"`
	Title       string       `json:"title"`
	PhaseID     int          `json:"phaseId"`
	Order       int          `json:"order"`
	NodeCode    string       `json:"nodeCode"`
	GoCode      string       `json:"goCode"`
	Explanation string       `json:"explanation"`
	TeacherTips []TeacherTip `json:"teacherTips"`
	Annotations []Annotation `json:"annotations"`
	Challenge   Challenge    `json:"challenge"`
	TestCases   []TestCase   `json:"testCases"`
	XPReward    int          `json:"xpReward"`
	CoinReward  int          `json:"coinReward"`
	Playable    bool         `json:"playable"`
	// Navigation
	PrevSlug string `json:"prevSlug"`
	NextSlug string `json:"nextSlug"`
	Number   string `json:"number"` // "1.3" = phase 1, lesson 3
}

// TeacherTip is a callout from the teacher pointing out gotchas and key concepts
type TeacherTip struct {
	Type    string `json:"type"`    // gotcha, remember, protip, warning
	Title   string `json:"title"`
	Content string `json:"content"`
}

// Annotation links a line in JS to a line in Go with explanation text
type Annotation struct {
	LineGo   int    `json:"lineGo"`
	LineNode int    `json:"lineNode"`
	Text     string `json:"text"`
}

// Challenge defines an interactive coding exercise
type Challenge struct {
	Type        string   `json:"type"` // fill_blank, rewrite, fix_bug, build
	Prompt      string   `json:"prompt"`
	StarterCode string   `json:"starterCode"`
	Solution    string   `json:"solution"`
	ExpectedOut string   `json:"expectedOutput"`
	Hints       []string `json:"hints"`
	BonusXP     int      `json:"bonusXP"`
	BonusCoins  int      `json:"bonusCoins"`
}

// TestCase validates user code produces expected output
type TestCase struct {
	Name        string `json:"name"`
	Input       string `json:"input"`
	WrapperCode string `json:"wrapperCode"`
	ExpectedOut string `json:"expectedOutput"`
}

// Curriculum holds the complete learning content
type Curriculum struct {
	Phases []Phase `json:"phases"`
}

// FindLesson looks up a lesson by slug across all phases
func (c *Curriculum) FindLesson(slug string) *Lesson {
	for i := range c.Phases {
		for j := range c.Phases[i].Lessons {
			if c.Phases[i].Lessons[j].Slug == slug {
				return &c.Phases[i].Lessons[j]
			}
		}
	}
	return nil
}

// FindPhaseByLesson returns the phase containing the given lesson slug
func (c *Curriculum) FindPhaseByLesson(slug string) *Phase {
	for i := range c.Phases {
		for _, l := range c.Phases[i].Lessons {
			if l.Slug == slug {
				return &c.Phases[i]
			}
		}
	}
	return nil
}
