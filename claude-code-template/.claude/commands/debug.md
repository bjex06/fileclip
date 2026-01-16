# Debug Assistant

$ARGUMENTS - エラーメッセージまたは症状

## Process
1. **分類**: Build/Runtime/Data/Style Error
2. **調査**: ログ確認、git diff、依存関係
3. **分析**: スタックトレース解析
4. **解決**: 修正案 + 再発防止策

## Common Issues
- **Hydration Mismatch**: Server/Client差異 → useEffect移動
- **NEXT_PUBLIC_ undefined**: .env.local確認 → サーバー再起動
- **Supabase Invalid API key**: 環境変数確認
- **Module not found**: pnpm install / tsconfig paths確認

## Usage
```
/debug "Error: Cannot read property 'x' of undefined"
```
