# Test and Commit

テスト実行後、成功したら自動コミットする。

## Steps

1. **Lint Check**: `pnpm lint --fix`
2. **Type Check**: `pnpm tsc --noEmit`
3. **Run Tests**: `pnpm test --passWithNoTests`
4. **Stage Changes**: `git add -A`
5. **Generate Commit Message**: 変更分析 → Conventional Commits形式
6. **Commit**: `git commit -m "<message>"`

## Error Handling
- Lintエラー: 自動修正試行、修正不可なら報告
- Type Error: エラー箇所特定して修正提案
- Test Failure: 失敗テスト分析して修正提案

## Usage
```
/test-and-commit
```
