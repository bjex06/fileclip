---
name: job-posting
description: |
  求人原稿の作成・最適化スキル。engage/AirWORK向け求人制作、
  Google しごと検索対応の構造化データ、心理学的アプローチ、
  コールドリーディング技法、SEO最適化。
  求人、採用、募集要項、求人原稿作成時に使用。
  トリガー: 求人、採用、募集、engage、AirWORK、Indeed
---

# 求人制作スキル

## 求人原稿の構成

### 1. タイトル（30文字以内）
- 職種 + 魅力ポイント + 数字
- 例: 「月給30万円〜/完全週休2日/未経験OKの営業職」

### 2. 仕事内容
```markdown
【業務概要】1行で要約
【具体的な仕事内容】箇条書き3-5項目 + 1日の流れ
【入社後の流れ】研修制度・サポート体制
```

### 3. 応募資格
- 必須条件: 最小限（応募ハードル↓）
- 歓迎条件: あれば良い程度
- 求める人物像: 性格・価値観ベース

### 4. 給与・待遇
- 具体的金額明記
- 諸手当詳細
- 昇給・賞与実績

## Google しごと検索対応

```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "職種名",
  "description": "仕事内容",
  "datePosted": "2024-01-01",
  "validThrough": "2024-03-31",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "会社名"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "市区町村",
      "addressRegion": "都道府県",
      "addressCountry": "JP"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "JPY",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 250000,
      "maxValue": 400000,
      "unitText": "MONTH"
    }
  }
}
```

## 心理学的アプローチ

### コールドリーディング技法
- 「こんな悩みありませんか？」→ ターゲット共通課題提示
- 「実は多くの方が〇〇を求めています」→ 社会的証明
- 「今のあなたに必要なのは△△では？」→ 潜在ニーズ顕在化

### 行動心理学の応用
| 原理 | 活用例 |
|------|--------|
| 損失回避 | 「この機会を逃すと...」 |
| 希少性 | 「限定3名募集」 |
| 社会的証明 | 「入社1年目の声」 |
| 権威 | 「業界シェアNo.1」 |
| 一貫性 | 「まずは説明会から」 |

## engage / AirWORK 最適化

### engage
- 企業PR文: 400文字以内
- 写真: 職場風景3枚以上
- 動画: あれば優先表示

### AirWORK
- Indeed連携設定
- 応募者自動返信文
- 面接日程自動化

## 公開前チェックリスト

- [ ] 誤字脱字チェック
- [ ] 労働条件の正確性
- [ ] 差別表現がないか
- [ ] 応募ボタン動作確認
- [ ] スマホ表示確認
- [ ] 構造化データ検証
