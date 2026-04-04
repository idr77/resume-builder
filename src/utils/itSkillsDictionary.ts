// Exporting a small dictionary of common tech/business keywords for the MVP matching engine.
// This is used instead of a generic stop-word filter to guarantee relevancy.

export const ITSkillsDictionary: string[] = [
  // Programming Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "golang", "swift", "kotlin", "rust", "sql", "pl/sql", "html", "css", "bash", "shell", "dart",
  
  // Frameworks & Libraries
  "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt", "svelte", "jquery", "bootstrap", "tailwind", "express", "django", "flask", "spring", "spring boot", "ruby on rails", ".net", "laravel", "symfony", "flutter", "react native", "graphql", "apollo", "redux", "mobx", "rxjs", "nodejs", "node.js", "quarkus",
  
  // Databases
  "mysql", "postgresql", "mongodb", "sqlite", "redis", "cassandra", "dynamodb", "elasticsearch", "oracle", "mariadb", "firebase", "supabase",

  // Cloud & DevOps
  "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "gitlab", "github actions", "circleci", "travis", "docker-compose", "linux", "unix", "ubuntu", "centos", "serverless",

  // Data & AI / ML
  "machine learning", "artificial intelligence", "ml", "ai", "deep learning", "pandas", "numpy", "tensorflow", "pytorch", "scikit-learn", "keras", "data science", "data analysis", "big data", "hadoop", "spark", "kafka", "power bi", "tableau", "llm", "gpt", "rag", "generative ai",

  // Architecture & Concepts
  "api", "rest", "restful", "soap", "microservices", "agile", "scrum", "kanban", "ci/cd", "continuous integration", "continuous deployment", "tdd", "bdd", "design patterns", "oop", "object oriented", "fp", "functional programming", "mvc", "mvvm", "solid", "serverless", "event-driven",

  // Tools
  "git", "svn", "github", "gitlab", "bitbucket", "jira", "confluence", "trello", "npm", "yarn", "pnpm", "webpack", "vite", "babel", "eslint", "prettier", "sonarqube", "figma", "sketch", "postman", "swagger", "openapi", "excel", "word", "powerpoint",

  // Soft Skills & Business (frequently scanned)
  "leadership", "management", "communication", "teamwork", "problem solving", "mentoring", "architecture", "strategy", "project management", "product management", "stakeholder", "budget", "optimization", "performance", "security", "testing", "quality assurance", "qa"
];

// Normalize the dictionary for efficient lookups
export const NormalizedITSkills = new Set(ITSkillsDictionary.map(k => k.toLowerCase()));
