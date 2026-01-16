# Claude Code Hooks

Hooksは特定イベントで自動実行されます。

## Available Events
- PreToolUse: ツール実行前
- PostToolUse: ツール実行後
- Notification: 通知送信時
- Stop: Claude停止時

## 設定例（settings.json）

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm prettier --write $CLAUDE_FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

## 環境変数
- $CLAUDE_FILE_PATH - 操作対象ファイル
- $CLAUDE_TOOL_NAME - 実行ツール名
- $CLAUDE_WORKING_DIR - 作業ディレクトリ
