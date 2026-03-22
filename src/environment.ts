import { access, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface EnvironmentDetection {
  languages: string[];
  databases: string[];
  cloud: string[];
  cicd: string[];
  frameworks: string[];
  services: string[];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function extractEnvKeyNames(filePath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, "utf8");
    const keys: string[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        keys.push(trimmed.slice(0, eqIndex).trim());
      }
    }
    return keys;
  } catch (err) {
    if (process.env["MCP_OBSERVATORY_DEBUG"]) {
      process.stderr.write(`[observatory] environment detection error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
    return [];
  }
}

async function extractDockerComposeServices(filePath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, "utf8");
    const services: string[] = [];
    const dbPatterns = ["postgres", "mysql", "mariadb", "redis", "mongo", "elasticsearch", "rabbitmq", "kafka"];
    const lower = content.toLowerCase();
    for (const pat of dbPatterns) {
      if (lower.includes(pat)) {
        services.push(pat);
      }
    }
    return services;
  } catch (err) {
    if (process.env["MCP_OBSERVATORY_DEBUG"]) {
      process.stderr.write(`[observatory] environment detection error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
    return [];
  }
}

const LANGUAGE_FILES: Record<string, string> = {
  "package.json": "Node.js / JavaScript / TypeScript",
  "requirements.txt": "Python",
  "pyproject.toml": "Python",
  "setup.py": "Python",
  "go.mod": "Go",
  "Cargo.toml": "Rust",
  "Gemfile": "Ruby",
  "pom.xml": "Java (Maven)",
  "build.gradle": "Java (Gradle)",
  "build.gradle.kts": "Kotlin (Gradle)",
  "composer.json": "PHP",
  "mix.exs": "Elixir",
  "Package.swift": "Swift",
};

const FRAMEWORK_FILES: Record<string, string> = {
  "next.config.js": "Next.js",
  "next.config.mjs": "Next.js",
  "next.config.ts": "Next.js",
  "nuxt.config.ts": "Nuxt",
  "nuxt.config.js": "Nuxt",
  "angular.json": "Angular",
  "svelte.config.js": "SvelteKit",
  "astro.config.mjs": "Astro",
  "remix.config.js": "Remix",
  "vite.config.ts": "Vite",
  "vite.config.js": "Vite",
  "webpack.config.js": "Webpack",
  "tailwind.config.js": "Tailwind CSS",
  "tailwind.config.ts": "Tailwind CSS",
  "prisma/schema.prisma": "Prisma",
  "drizzle.config.ts": "Drizzle ORM",
  "knexfile.js": "Knex.js",
  "knexfile.ts": "Knex.js",
};

const CICD_FILES: Record<string, string> = {
  ".github/workflows": "GitHub Actions",
  ".gitlab-ci.yml": "GitLab CI",
  "Jenkinsfile": "Jenkins",
  ".circleci/config.yml": "CircleCI",
  ".travis.yml": "Travis CI",
  "bitbucket-pipelines.yml": "Bitbucket Pipelines",
};

const CLOUD_FILES: Record<string, string> = {
  ".aws": "AWS",
  ".gcloud": "Google Cloud",
  "terraform": "Terraform",
  "main.tf": "Terraform",
  "cdk.json": "AWS CDK",
  "serverless.yml": "Serverless Framework",
  "fly.toml": "Fly.io",
  "vercel.json": "Vercel",
  "netlify.toml": "Netlify",
  "render.yaml": "Render",
  "Dockerfile": "Docker",
  "docker-compose.yml": "Docker Compose",
  "docker-compose.yaml": "Docker Compose",
};

const SERVICE_KEY_PATTERNS: Record<string, string> = {
  "STRIPE": "Stripe",
  "SLACK": "Slack",
  "NOTION": "Notion",
  "SENTRY": "Sentry",
  "DATADOG": "Datadog",
  "OPENAI": "OpenAI",
  "ANTHROPIC": "Anthropic",
  "GITHUB": "GitHub",
  "GITLAB": "GitLab",
  "JIRA": "Jira",
  "LINEAR": "Linear",
  "TWILIO": "Twilio",
  "SENDGRID": "SendGrid",
  "MAILGUN": "Mailgun",
  "AWS": "AWS",
  "FIREBASE": "Firebase",
  "SUPABASE": "Supabase",
  "CLOUDFLARE": "Cloudflare",
  "VERCEL": "Vercel",
  "HEROKU": "Heroku",
  "REDIS": "Redis",
  "DATABASE": "Database",
  "POSTGRES": "PostgreSQL",
  "MYSQL": "MySQL",
  "MONGO": "MongoDB",
};

const DB_ENV_PATTERNS = ["DATABASE_URL", "REDIS_URL", "MONGO_URI", "MONGODB_URI", "POSTGRES_URL", "MYSQL_URL"];

export async function detectEnvironment(cwd: string): Promise<EnvironmentDetection> {
  const result: EnvironmentDetection = {
    languages: [],
    databases: [],
    cloud: [],
    cicd: [],
    frameworks: [],
    services: [],
  };

  const seen = {
    languages: new Set<string>(),
    databases: new Set<string>(),
    cloud: new Set<string>(),
    cicd: new Set<string>(),
    frameworks: new Set<string>(),
    services: new Set<string>(),
  };

  function add(category: keyof EnvironmentDetection, value: string): void {
    if (!seen[category].has(value)) {
      seen[category].add(value);
      result[category].push(value);
    }
  }

  // Check language files
  const langChecks = Object.entries(LANGUAGE_FILES).map(async ([file, lang]) => {
    if (await exists(path.join(cwd, file))) add("languages", lang);
  });

  // Check framework files
  const frameworkChecks = Object.entries(FRAMEWORK_FILES).map(async ([file, fw]) => {
    if (await exists(path.join(cwd, file))) add("frameworks", fw);
  });

  // Check CI/CD files
  const cicdChecks = Object.entries(CICD_FILES).map(async ([file, ci]) => {
    if (await exists(path.join(cwd, file))) add("cicd", ci);
  });

  // Check cloud files
  const cloudChecks = Object.entries(CLOUD_FILES).map(async ([file, cloud]) => {
    if (await exists(path.join(cwd, file))) add("cloud", cloud);
  });

  // Also check home directory for cloud configs
  const home = os.homedir();
  const homeCloudChecks = [
    [".aws", "AWS"],
    [".gcloud", "Google Cloud"],
    [".azure", "Azure"],
  ].map(async ([dir, name]) => {
    if (dir && name && await exists(path.join(home, dir))) add("cloud", name);
  });

  await Promise.all([...langChecks, ...frameworkChecks, ...cicdChecks, ...cloudChecks, ...homeCloudChecks]);

  // Check docker-compose for database services
  for (const dcFile of ["docker-compose.yml", "docker-compose.yaml"]) {
    const dcPath = path.join(cwd, dcFile);
    const services = await extractDockerComposeServices(dcPath);
    for (const s of services) add("databases", s);
  }

  // Scan .env files for service and database patterns
  let envFiles: string[] = [];
  try {
    const dirEntries = await readdir(cwd);
    envFiles = dirEntries.filter((f) => f === ".env" || f.startsWith(".env."));
  } catch (err) {
    if (process.env["MCP_OBSERVATORY_DEBUG"]) {
      process.stderr.write(`[observatory] environment detection error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  for (const envFile of envFiles) {
    const keys = await extractEnvKeyNames(path.join(cwd, envFile));
    for (const key of keys) {
      // Check database URL patterns
      for (const dbPat of DB_ENV_PATTERNS) {
        if (key === dbPat || key.endsWith(`_${dbPat}`)) {
          const dbName = dbPat.replace(/_URL$/, "").replace(/_URI$/, "").toLowerCase();
          add("databases", dbName);
        }
      }

      // Check service key patterns
      const upperKey = key.toUpperCase();
      for (const [pattern, serviceName] of Object.entries(SERVICE_KEY_PATTERNS)) {
        if (upperKey.includes(pattern) && (upperKey.includes("KEY") || upperKey.includes("TOKEN") || upperKey.includes("SECRET") || upperKey.includes("DSN") || upperKey.includes("URL"))) {
          add("services", serviceName);
        }
      }
    }
  }

  return result;
}
