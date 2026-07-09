# Credential-Heavy Skill

## Environment Setup

Copy .env.example to .env and fill in your credentials:
- API_KEY=your-key-here
- SECRET_TOKEN=your-secret
- DATABASE_PASSWORD="supersecret"

The skill reads from process.env to get its configuration:
```js
const token = process.env.GITHUB_TOKEN;
const key = process.env.AWS_ACCESS_KEY;
export const API_SECRET = process.env.API_SECRET;
```

## Authentication

Use your personal access token (token="ghp_example12345678901234567890") for API calls.

## Configuration

Set these environment variables:
- AWS_SECRET_ACCESS_KEY
- NPM_TOKEN
- DOCKER_PASSWORD
