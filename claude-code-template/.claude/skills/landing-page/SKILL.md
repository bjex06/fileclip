---
name: landing-page
description: |
  コンバージョン率の高いランディングページ構築スキル。
  Hero、Features、Pricing、Testimonials、CTA設計、
  コピーライティング、心理学的アプローチ、SEO最適化。
  LP作成、サービス紹介ページ、プロダクトページ構築時に使用。
  トリガー: ランディングページ、LP、サービスページ、プロダクトページ、Hero
---

# Landing Page Skill

## 構成要素

### 1. Hero Section
```tsx
<section className="relative min-h-[90vh] flex items-center overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
  
  <div className="container relative z-10 mx-auto px-4 py-20">
    {/* Badge */}
    <div className="flex justify-center mb-8">
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
        <Sparkles className="h-4 w-4" />
        新機能リリース
      </span>
    </div>

    {/* Headline */}
    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center text-white max-w-4xl mx-auto leading-tight">
      <span className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
        業務効率を10倍にする
      </span>
      <br />
      次世代プラットフォーム
    </h1>

    {/* Subheadline */}
    <p className="mt-6 text-lg md:text-xl text-slate-400 text-center max-w-2xl mx-auto">
      AIが自動で分析・提案。面倒な作業から解放されて、
      本当に大切なことに集中できます。
    </p>

    {/* CTA */}
    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
      <Button size="xl" className="bg-violet-600 hover:bg-violet-700">
        無料で始める
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
      <Button size="xl" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
        <Play className="mr-2 h-5 w-5" />
        デモを見る
      </Button>
    </div>

    {/* Social Proof */}
    <div className="mt-12 text-center">
      <p className="text-sm text-slate-500 mb-4">1,000社以上が導入</p>
      <div className="flex justify-center gap-8 opacity-50">
        {/* Logo images */}
      </div>
    </div>
  </div>
</section>
```

### 2. Features Section
```tsx
<section className="py-24 bg-slate-50 dark:bg-slate-900/50">
  <div className="container mx-auto px-4">
    {/* Section Header */}
    <div className="text-center max-w-2xl mx-auto mb-16">
      <span className="text-violet-600 font-medium">機能</span>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold">
        すべてが揃ったオールインワン
      </h2>
      <p className="mt-4 text-muted-foreground">
        必要な機能がすべて揃っているから、
        複数のツールを行き来する必要はありません。
      </p>
    </div>

    {/* Feature Grid */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map((feature) => (
        <Card key={feature.title} className="group hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="h-12 w-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <feature.icon className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

### 3. Social Proof / Testimonials
```tsx
<section className="py-24">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-16">
      お客様の声
    </h2>

    <div className="grid md:grid-cols-3 gap-8">
      {testimonials.map((t) => (
        <Card key={t.name} className="relative">
          <CardContent className="p-6">
            <Quote className="h-8 w-8 text-violet-200 absolute top-4 right-4" />
            <div className="flex items-center gap-4 mb-4">
              <Avatar>
                <AvatarImage src={t.avatar} />
                <AvatarFallback>{t.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </div>
            <p className="text-muted-foreground">{t.quote}</p>
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

### 4. Pricing Section
```tsx
<section className="py-24 bg-slate-50 dark:bg-slate-900/50">
  <div className="container mx-auto px-4">
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold">シンプルな料金体系</h2>
      <p className="mt-4 text-muted-foreground">隠れた費用なし。いつでもキャンセル可能。</p>
    </div>

    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan) => (
        <Card key={plan.name} className={cn(
          'relative',
          plan.popular && 'border-violet-500 shadow-lg scale-105'
        )}>
          {plan.popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-3 py-1 rounded-full">
              人気
            </span>
          )}
          <CardContent className="p-6">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold">¥{plan.price}</span>
              <span className="text-muted-foreground">/月</span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full mt-6" variant={plan.popular ? 'default' : 'outline'}>
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

### 5. Final CTA
```tsx
<section className="py-24 bg-gradient-to-r from-violet-600 to-indigo-600">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-3xl md:text-4xl font-bold text-white">
      今すぐ始めましょう
    </h2>
    <p className="mt-4 text-violet-100 max-w-2xl mx-auto">
      14日間の無料トライアル。クレジットカード不要。
      いつでもキャンセル可能。
    </p>
    <Button size="xl" className="mt-8 bg-white text-violet-600 hover:bg-violet-50">
      無料で始める
      <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  </div>
</section>
```

## コピーライティング原則

### ヘッドライン
- 数字を含める（「10倍」「30分で」）
- ベネフィットを明確に
- 好奇心を刺激

### CTA
- 動詞で始める
- 緊急性を出す（「今すぐ」）
- リスクを下げる（「無料で」「クレジットカード不要」）

### 心理学的アプローチ
- **社会的証明**: 導入企業数、レビュー
- **希少性**: 期間限定、残り枠
- **権威**: メディア掲載、受賞歴
- **一貫性**: 小さなYesから始める

## SEO チェックリスト

- [ ] title: 60文字以内、キーワード含む
- [ ] meta description: 120-160文字
- [ ] h1: 1つのみ、キーワード含む
- [ ] 構造化データ: Organization, Product
- [ ] OGP設定
- [ ] Core Web Vitals対応
