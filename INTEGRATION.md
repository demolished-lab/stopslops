# Integration Examples

Comprehensive guide to integrating Universal Anti-Slop with your tools and workflows.

---

## Table of Contents

- [IDE Integrations](#ide-integrations)
- [CI/CD Integrations](#cicd-integrations)
- [Communication Tools](#communication-tools)
- [Project Management](#project-management)
- [Monitoring](#monitoring)
- [Custom Integrations](#custom-integrations)

---

## IDE Integrations

### VS Code

#### Extension Settings

```json
// .vscode/settings.json
{
  "antislop.checkOnSave": true,
  "antislop.autoFix": true,
  "antislop.severity": "warning"
}
```

#### Task Configuration

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Anti-Slop Check",
      "type": "shell",
      "command": "antislop-check",
      "group": "test",
      "problemMatcher": []
    }
  ]
}
```

#### Key Bindings

```json
// .vscode/keybindings.json
[
  {
    "key": "ctrl+shift+a",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "antislop-check\n" }
  }
]
```

### JetBrains (IntelliJ/WebStorm)

#### External Tools

```xml
<!-- .idea/workspace.xml -->
<component name="ExternalProjectImport">
  <project>
    <option name="name" value="Anti-Slop Check" />
    <option name="command" value="antislop-check" />
    <option name="working_directory" value="$ProjectFileDir$" />
  </project>
</component>
```

### Vim/Neovim

```vim
" ~/.vimrc or init.vim
autocmd BufWritePost *.ts,*.js,*.mjs !antislop-check --file <afile>
```

### Emacs

```elisp
;; ~/.emacs.d/init.el
(defun run-antislop ()
  (interactive)
  (shell-command (concat "antislop-check --file " buffer-file-name)))

(add-hook 'after-save-hook 'run-antislop)
```

---

## CI/CD Integrations

### GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Quality Gate

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - name: Comment on PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Quality check failed. Please fix issues before merge.'
            })
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - quality

quality:
  stage: quality
  image: node:20
  script:
    - npm install -g pnpm
    - pnpm install
    - pnpm check
    - pnpm test
  only:
    - merge_requests
    - main
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  quality:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: |
            sudo npm install -g pnpm
            pnpm install
      - run:
          name: Run quality checks
          command: pnpm check
      - run:
          name: Run tests
          command: pnpm test

workflows:
  quality:
    jobs:
      - quality
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Quality Check') {
            steps {
                sh 'pnpm install'
                sh 'pnpm check'
                sh 'pnpm test'
            }
        }
    }
    
    post {
        failure {
            slackSend channel: '#engineering',
                      message: "❌ Quality check failed: ${env.JOB_NAME}"
        }
    }
}
```

---

## Communication Tools

### Slack

```javascript
// scripts/slack-notify.mjs
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_TOKEN);

export async function notifyQuality(status, details) {
  const emoji = status === 'pass' ? '✅' : '❌';
  
  await slack.chat.postMessage({
    channel: '#quality',
    text: `${emoji} Quality Check ${status}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Quality Check ${status}*\n${details}`
        }
      }
    ]
  });
}
```

### Microsoft Teams

```javascript
// scripts/teams-notify.mjs
import fetch from 'node-fetch';

export async function notifyQuality(status, details) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      summary: `Quality Check ${status}`,
      sections: [{
        activityTitle: `Quality Check ${status}`,
        facts: details
      }]
    })
  });
}
```

### Discord

```javascript
// scripts/discord-notify.mjs
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

export async function notifyQuality(status, details) {
  const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
  
  await channel.send(`**Quality Check ${status}**\n${details}`);
}
```

---

## Project Management

### Jira

```javascript
// scripts/jira-integration.mjs
import JiraClient from 'jira-client';

const jira = new JiraClient({
  host: process.env.JIRA_HOST,
  user: process.env.JIRA_USER,
  password: process.env.JIRA_TOKEN
});

export async function createIssue(qualityIssue) {
  return jira.addNewIssue({
    fields: {
      project: { key: 'QUALITY' },
      summary: qualityIssue.title,
      description: qualityIssue.description,
      issuetype: { name: 'Bug' },
      priority: { name: qualityIssue.severity }
    }
  });
}
```

### Linear

```javascript
// scripts/linear-integration.mjs
import { LinearClient } from '@linear/sdk';

const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

export async function createIssue(qualityIssue) {
  return linear.issueCreate({
    title: qualityIssue.title,
    description: qualityIssue.description,
    teamId: process.env.LINEAR_TEAM_ID
  });
}
```

### GitHub Issues

```javascript
// scripts/github-integration.mjs
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function createIssue(owner, repo, qualityIssue) {
  return octokit.issues.create({
    owner,
    repo,
    title: qualityIssue.title,
    body: qualityIssue.description,
    labels: ['quality', qualityIssue.severity]
  });
}
```

---

## Monitoring

### Prometheus

```javascript
// scripts/metrics.mjs
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

export const checksTotal = new Counter({
  name: 'antislop_checks_total',
  help: 'Total number of quality checks',
  labelNames: ['category', 'status'],
  registers: [registry]
});

export const checkDuration = new Histogram({
  name: 'antislop_check_duration_seconds',
  help: 'Duration of quality checks',
  labelNames: ['category'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry]
});

export async function getMetrics() {
  return registry.metrics();
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Universal Anti-Slop",
    "panels": [
      {
        "title": "Quality Checks",
        "type": "graph",
        "targets": [{
          "expr": "rate(antislop_checks_total[5m])",
          "legendFormat": "{{category}} - {{status}}"
        }]
      },
      {
        "title": "Check Duration",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(antislop_check_duration_seconds_bucket[5m]))",
          "legendFormat": "P95"
        }]
      }
    ]
  }
}
```

### DataDog

```javascript
// scripts/datadog-integration.mjs
import StatsD from 'hot-shots';

const client = new StatsD({
  host: process.env.DD_AGENT_HOST,
  port: 8125
});

export function sendMetrics(metrics) {
  client.increment('antislop.checks', metrics.checks);
  client.timing('antislop.duration', metrics.duration);
}
```

---

## Custom Integrations

### Webhook Receiver

```javascript
// scripts/webhook.mjs
import { createServer } from 'node:http';

const server = createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const event = JSON.parse(body);
      
      // Process webhook event
      console.log('Received:', event);
      
      res.writeHead(200);
      res.end('OK');
    });
  }
});

server.listen(3000);
```

### Webhook Sender

```javascript
// scripts/webhook-sender.mjs
import fetch from 'node-fetch';

export async function sendWebhook(url, data) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
```

### Custom Script Integration

```bash
#!/bin/bash
# scripts/custom-check.sh

# Run quality checks
pnpm check

# If passed, deploy
if [ $? -eq 0 ]; then
  echo "Quality check passed, deploying..."
  ./scripts/deploy.sh
else
  echo "Quality check failed, aborting deployment"
  exit 1
fi
```

---

## API Client Examples

### JavaScript/Node.js

```javascript
// client.mjs
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

export async function checkQuality(filePath) {
  const response = await fetch(`${API_URL}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath })
  });
  
  return response.json();
}

export async function judgeFile(category, filePath) {
  const response = await fetch(`${API_URL}/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, file: filePath })
  });
  
  return response.json();
}
```

### Python

```python
# client.py
import requests

API_URL = "http://localhost:3000"

def check_quality(file_path):
    response = requests.post(
        f"{API_URL}/check",
        json={"path": file_path}
    )
    return response.json()

def judge_file(category, file_path):
    response = requests.post(
        f"{API_URL}/judge",
        json={"category": category, "file": file_path}
    )
    return response.json()
```

### Go

```go
// client.go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

const APIURL = "http://localhost:3000"

func checkQuality(filePath string) (map[string]interface{}, error) {
    data := map[string]string{"path": filePath}
    jsonData, _ := json.Marshal(data)
    
    resp, err := http.Post(
        APIURL+"/check",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    
    return result, nil
}
```

---

## Integration Checklist

- [ ] IDE integration configured
- [ ] CI/CD pipeline updated
- [ ] Communication tools connected
- [ ] Project management linked
- [ ] Monitoring dashboards created
- [ ] Webhooks configured
- [ ] API clients tested
- [ ] Documentation updated

---

**Pick your integration. Connect your tools. Ship quality.**
