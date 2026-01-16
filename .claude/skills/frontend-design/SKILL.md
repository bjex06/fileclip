---
name: frontend-design
description: |
  高品質でおしゃれなUI/UXを実現するフロントエンドデザインスキル。
  汎用的な「AIっぽい」デザインを避け、独自性のある洗練されたインターフェースを構築。
  タイポグラフィ、カラー、アニメーション、レイアウト、ビジュアルエフェクト。
  UI作成、デザイン改善、ランディングページ、ダッシュボード構築時に使用。
  トリガー: UI、デザイン、おしゃれ、かっこいい、美しい、ランディングページ、ダッシュボード
---

# Frontend Design Skill

## Design Thinking（実装前に考える）

### 1. コンテキスト理解
- **目的**: 何の問題を解決するか？
- **ユーザー**: 誰が使うか？
- **トーン**: どんな印象を与えたいか？

### 2. 美的方向性を決める（BOLD に）
```
ミニマル / マキシマリスト / レトロフューチャー / オーガニック
ラグジュアリー / プレイフル / エディトリアル / ブルータリスト
アールデコ / ソフトパステル / インダストリアル / グラスモーフィズム
```

### 3. 差別化ポイント
「これを見た人が覚えているのは何か？」を明確にする。

## 避けるべきパターン ❌

### Generic AI Aesthetics（絶対NG）
- **フォント**: Inter, Roboto, Arial, system-ui
- **カラー**: 紫グラデーション + 白背景
- **レイアウト**: 予測可能なカード配置
- **全体**: どこかで見たような無個性なデザイン

## 実装ガイドライン ✅

### Typography
```css
/* ❌ Generic */
font-family: Inter, sans-serif;

/* ✅ Distinctive */
font-family: 'Playfair Display', serif; /* Display */
font-family: 'DM Sans', sans-serif;     /* Body */

/* Google Fonts推奨の独自性あるペアリング */
/* Display + Body */
Fraunces + Inter
Playfair Display + Source Sans Pro
Space Grotesk + Crimson Pro
Clash Display + Satoshi
Bebas Neue + Montserrat
```

### Color & Theme
```css
:root {
  /* 明確なカラーシステム */
  --color-primary: #1a1a2e;
  --color-accent: #e94560;
  --color-surface: #16213e;
  --color-text: #eaeaea;
  
  /* グラデーション */
  --gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  /* 影（深度表現） */
  --shadow-soft: 0 4px 20px rgba(0,0,0,0.08);
  --shadow-elevated: 0 12px 40px rgba(0,0,0,0.15);
}
```

### Motion & Animation
```css
/* ページロード時のスタガードアニメーション */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.6s ease-out forwards;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }

/* ホバーエフェクト */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
}
```

### Spatial Composition
- 非対称レイアウト
- オーバーラップ要素
- グリッドを意図的に崩す
- 十分なネガティブスペース

### Backgrounds & Visual Effects
```css
/* グラスモーフィズム */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* ノイズテクスチャ */
.noise {
  background-image: url("data:image/svg+xml,...");
}

/* メッシュグラデーション */
.mesh-gradient {
  background: 
    radial-gradient(at 40% 20%, #ff6b6b 0px, transparent 50%),
    radial-gradient(at 80% 0%, #4ecdc4 0px, transparent 50%),
    radial-gradient(at 0% 50%, #45b7d1 0px, transparent 50%);
}
```

## Tailwind CSS パターン

### Hero Section
```tsx
<section className="relative min-h-screen overflow-hidden bg-slate-950">
  {/* Background Effect */}
  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-600/20" />
  
  {/* Content */}
  <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
    <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white">
      <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
        見出しテキスト
      </span>
    </h1>
    <p className="mt-6 text-xl text-slate-400 max-w-2xl text-center">
      説明文をここに
    </p>
  </div>
</section>
```

### Card Component
```tsx
<div className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20">
  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

## チェックリスト

- [ ] フォント: Inter/Roboto以外を選択
- [ ] カラー: 紫グラデーション + 白を避ける
- [ ] アニメーション: ページロード + ホバー実装
- [ ] レイアウト: 非対称or意図的な構成
- [ ] 背景: ソリッドカラー以外の工夫
- [ ] 一貫性: CSS変数でシステム化
