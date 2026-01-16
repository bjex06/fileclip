# Code Review

変更ファイルを包括的にレビュー。

## Checklist

### Security
- SQLインジェクション対策（RLS）
- XSS対策
- 認証・認可
- シークレット漏洩防止

### Performance
- 不要なre-render防止
- データフェッチ戦略
- バンドルサイズ影響

### Code Quality
- TypeScript型（any禁止）
- エラーハンドリング
- コード重複

## Output
```markdown
## 🔴 Critical | 🟡 Improvements | 🟢 Good Patterns
```

## Usage
```
/review
/review src/components/
```
