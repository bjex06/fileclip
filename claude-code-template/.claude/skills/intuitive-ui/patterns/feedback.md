# Feedback（操作フィードバック）

操作の結果を即座に、明確に伝える。

## 実装例

```tsx
function ActionButton({ onClick, children }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleClick = async () => {
    setStatus('loading')
    try {
      await onClick()
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <Button onClick={handleClick} disabled={status === 'loading'}>
      {status === 'loading' && <Loader2 className="animate-spin mr-2" />}
      {status === 'success' && <Check className="mr-2 text-green-500" />}
      {status === 'error' && <X className="mr-2 text-red-500" />}
      {children}
    </Button>
  )
}
```

## ポイント

- **処理中**: スピナー + ボタン無効化
- **成功**: チェックマーク + 自動で戻る
- **失敗**: エラー表示 + 再試行可能
