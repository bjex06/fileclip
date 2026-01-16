# Confirmation（危険操作の確認）

取り消せない操作の前に、何が起こるか明示。

## 実装例

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">削除</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        「{item.name}」を削除しますか？
      </AlertDialogTitle>
      <AlertDialogDescription>
        この操作は取り消せません。関連するデータもすべて削除されます。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        削除する
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## ポイント

- **何が**消えるか具体的に書く
- **影響範囲**を書く（関連データも消える等）
- キャンセルボタンを左に（間違えて押しにくく）
