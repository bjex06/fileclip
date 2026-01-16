# Contextual Help（ツールチップ・ヘルプ）

必要な場所で、必要な説明を。

## 実装例

```tsx
function FormField({ label, help, children }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{help}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  )
}

// 使用
<FormField
  label="API キー"
  help="設定画面から取得できます。外部に公開しないでください。"
>
  <Input />
</FormField>
```

## 使いどころ

- 専門用語の横
- 入力フォーマットの説明
- 操作の影響範囲の説明
