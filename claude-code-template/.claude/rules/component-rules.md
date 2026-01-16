# Component Rules

適用: `src/components/**/*.tsx`

## Structure
1. Imports (external → internal → types)
2. Types/Interfaces
3. Component (hooks → memoized → callbacks → effects → early returns → render)

## Server vs Client
- **Server (default)**: データフェッチ、静的レンダリング
- **Client ('use client')**: インタラクティブ機能のみ

## Naming
| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `UserProfile` |
| Handler | handle + Event | `handleClick` |
| Boolean | is/has/should | `isLoading` |
| Callback | on + Action | `onSelect` |

## Performance
- 重い計算: `useMemo`
- コールバック安定化: `useCallback`
- コンポーネントメモ化: `memo`

## Accessibility
- `aria-label` on icon buttons
- `id` + `aria-describedby` on form elements
- Semantic HTML
