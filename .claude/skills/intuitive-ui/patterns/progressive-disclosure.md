# Progressive Disclosure（段階的開示）

最初はシンプル、必要に応じて詳細を表示。

## 実装例

```tsx
function SettingsPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div>
      {/* 基本設定（常に表示） */}
      <BasicSettings />

      {/* 詳細設定（必要な人だけ） */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger>
          詳細設定 {showAdvanced ? '▲' : '▼'}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AdvancedSettings />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

## 使いどころ

- 設定画面（基本 / 詳細）
- フォーム（必須項目 / 任意項目）
- ダッシュボード（概要 / 詳細データ）
