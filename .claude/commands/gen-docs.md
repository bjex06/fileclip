# Generate Documentation

コードからドキュメント自動生成。

## Types

### Components (`src/components/**/*.tsx`)
Props table + Usage example + Dependencies

### API Routes (`src/app/api/**/*.ts`)
Method + Request/Response + Error Codes

### Database Schema
Tables + Columns + Relationships

## Output
- Components: `docs/components/`
- API: `docs/api/`
- Schema: `docs/database/`

## Usage
```
/gen-docs
/gen-docs components
/gen-docs api
```
