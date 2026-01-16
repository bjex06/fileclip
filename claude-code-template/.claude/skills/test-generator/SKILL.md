---
name: test-generator
description: |
  Next.js + Reactアプリのテスト生成ガイド。
  Vitest + Testing Libraryによるユニットテスト、
  コンポーネントテスト、APIルートテスト、E2Eテスト設計。
  テスト作成、テストコード、TDD、テストケース設計時に使用。
  トリガー: test、テスト、vitest、testing-library、E2E、TDD
---

# Test Generator

## Setup

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

## Component Test Pattern

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UserCard } from './user-card'

const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' }

describe('UserCard', () => {
  it('renders user name', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<UserCard user={mockUser} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('shows loading state', () => {
    render(<UserCard user={mockUser} isLoading />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

## Hook Test Pattern

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCounter } from './use-counter'

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })

  it('handles async operations', async () => {
    const { result } = renderHook(() => useAsyncData())
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

## API Route Test Pattern

```typescript
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: () => ({ data: { user: { id: '1' } } }) },
    from: () => ({
      insert: () => ({ data: { id: '1' }, error: null }),
    }),
  }),
}))

describe('POST /api/users', () => {
  it('creates user successfully', async () => {
    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBeDefined()
  })

  it('returns 400 for invalid input', async () => {
    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
  })
})
```

## Test Naming Convention

```typescript
describe('[Component/Function Name]', () => {
  describe('[Method/Feature]', () => {
    it('[should/does] [expected behavior] [when/given condition]', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})

// Examples:
// 'should render user name when user prop is provided'
// 'returns error when input is invalid'
// 'calls onSubmit with form data when submitted'
```

## Coverage Goals

| Type | Target |
|------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

## Test File Location

```
src/
├── components/
│   └── user-card/
│       ├── user-card.tsx
│       └── user-card.test.tsx  # 同じディレクトリ
├── lib/
│   └── hooks/
│       ├── use-counter.ts
│       └── use-counter.test.ts
└── app/
    └── api/
        └── users/
            ├── route.ts
            └── route.test.ts
```
