package main

import (
	"goquest/internal/content"
	"goquest/internal/server"
	"log"
	"net/http"
	"path/filepath"
	"runtime"
)

func main() {
	// Resolve examples directory relative to this source file location
	_, thisFile, _, _ := runtime.Caller(0)
	projectDir := filepath.Dir(thisFile)
	examplesDir := filepath.Join(projectDir, "..", "golang-for-nodejs-developers", "examples")

	log.Printf("Loading curriculum from: %s", examplesDir)

	curriculum, err := content.LoadCurriculum(examplesDir)
	if err != nil {
		log.Fatalf("Failed to load curriculum: %v", err)
	}

	totalLessons := 0
	for _, p := range curriculum.Phases {
		totalLessons += len(p.Lessons)
	}
	log.Printf("Loaded %d phases with %d total lessons", len(curriculum.Phases), totalLessons)

	srv := server.New(curriculum)

	log.Println("GoQuest running on http://localhost:3000")
	log.Fatal(http.ListenAndServe(":3000", srv))
}
