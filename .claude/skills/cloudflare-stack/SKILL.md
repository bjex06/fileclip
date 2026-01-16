---
name: cloudflare-stack
description: |
  Cloudflareスタック統合スキル。Workers、Pages、D1、R2、KV、
  Durable Objects の実装パターン。
  Cloudflare、Workers、D1、R2使用時に自動適用。
  トリガー: cloudflare, workers, d1, r2, kv, pages
---

# Cloudflare Stack Skill

## Overview

| サービス | 用途 | 競合 |
|---------|------|------|
| Workers | サーバーレス関数 | Lambda |
| Pages | 静的サイト/SSR | Vercel |
| D1 | SQLiteデータベース | PlanetScale |
| R2 | オブジェクトストレージ | S3 |
| KV | Key-Valueストア | Redis |

## Setup

```bash
# Wrangler CLI
pnpm add -D wrangler
npx wrangler login

# Next.js on Cloudflare
pnpm create cloudflare@latest my-app -- --framework=next
```

## Workers

### Basic Worker
```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from Workers!' })
    }
    
    return new Response('Not Found', { status: 404 })
  },
}
```

### wrangler.toml
```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxx"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

[[kv_namespaces]]
binding = "KV"
id = "xxx"
```

## D1 (SQLite)

### Schema
```sql
-- migrations/0001_init.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Usage
```typescript
interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env) {
    // Query
    const users = await env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(1)
      .all()
    
    // Insert
    await env.DB
      .prepare('INSERT INTO users (email, name) VALUES (?, ?)')
      .bind('user@example.com', 'John')
      .run()
    
    // Batch
    const batch = [
      env.DB.prepare('INSERT INTO users (email) VALUES (?)').bind('a@example.com'),
      env.DB.prepare('INSERT INTO users (email) VALUES (?)').bind('b@example.com'),
    ]
    await env.DB.batch(batch)
    
    return Response.json(users)
  },
}
```

### Drizzle ORM with D1
```typescript
// lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
})

// lib/db/index.ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

// Usage
const db = getDb(env.DB)
const allUsers = await db.select().from(users)
```

## R2 (Storage)

```typescript
interface Env {
  BUCKET: R2Bucket
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const key = url.pathname.slice(1)
    
    switch (request.method) {
      case 'PUT': {
        await env.BUCKET.put(key, request.body, {
          httpMetadata: {
            contentType: request.headers.get('content-type') || 'application/octet-stream',
          },
        })
        return new Response('Uploaded', { status: 201 })
      }
      
      case 'GET': {
        const object = await env.BUCKET.get(key)
        if (!object) return new Response('Not Found', { status: 404 })
        
        return new Response(object.body, {
          headers: {
            'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
          },
        })
      }
      
      case 'DELETE': {
        await env.BUCKET.delete(key)
        return new Response('Deleted', { status: 200 })
      }
    }
  },
}
```

## KV

```typescript
interface Env {
  KV: KVNamespace
}

// Set with TTL
await env.KV.put('session:123', JSON.stringify(sessionData), {
  expirationTtl: 3600, // 1 hour
})

// Get
const data = await env.KV.get('session:123', 'json')

// Delete
await env.KV.delete('session:123')

// List
const list = await env.KV.list({ prefix: 'session:' })
```

## Pages with Next.js

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

// For edge runtime
export const runtime = 'edge'
```

## Checklist
- [ ] wrangler.toml 設定
- [ ] D1 マイグレーション
- [ ] R2 バケット作成
- [ ] KV namespace 作成
- [ ] 環境変数設定
- [ ] デプロイ確認
