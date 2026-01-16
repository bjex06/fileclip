# New Feature Scaffold

$ARGUMENTS - 機能名（kebab-case）

## Generated Structure
```
src/
├── app/(auth)/<feature>/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── components/features/<feature>/
│   ├── index.ts
│   ├── <feature>-form.tsx
│   └── <feature>-list.tsx
├── lib/hooks/use-<feature>.ts
└── types/<feature>.ts
```

## Post-Generation
1. 型定義をスキーマに合わせて編集
2. Supabaseテーブル作成（必要時）
3. RLSポリシー設定

## Usage
```
/new-feature user-profile
/new-feature recruitment-dashboard
```
