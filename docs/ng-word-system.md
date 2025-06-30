# NGワードシステム技術文書

## 概要

本文書は、HipHop MCバトルアプリケーション向けに開発された包括的なNGワードデータベース拡充システムの技術仕様書です。本システムは、日本語・英語対応の高精度NGワードフィルタリング機能を提供し、Mastra MCPツールとの統合により、リアルタイムでのコンテンツ監視・分析を実現します。

## システム概要

### アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   API Gateway   │    │ NgWordDatabase  │
│  (Admin Panel)  │◄──►│  (Express.js)   │◄──►│   (JSON File)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mastra MCP     │    │ Compliance      │    │   Backup &      │
│    Tools        │◄──►│   Services      │◄──►│  Version Mgmt   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 主要コンポーネント

1. **NgWordDatabase**: NGワードデータの永続化・検索・管理
2. **NgWordValidator**: データ整合性検証・品質管理
3. **NgWordUpdater**: データ更新・バージョン管理・バックアップ
4. **ForbiddenWordsManager**: 既存システムとの統合・レガシー互換性
5. **Mastra MCPツール**: AI エージェント統合・自動化対応
6. **RESTful API**: 外部システム連携・管理インターフェース

## データベース構造

### NgWordEntry スキーマ

```typescript
interface NgWordEntry {
  id: string;                    // 一意識別子
  category: string;              // カテゴリ名
  subcategory?: string;          // サブカテゴリ（オプション）
  term: string;                  // 禁止用語
  variants?: string[];           // 表記揺れ・類似語
  severity: 'critical' | 'high' | 'medium' | 'low';  // 重要度
  penalty: number;               // ペナルティスコア（0.1-1.0）
  language: 'ja' | 'en' | 'both'; // 対象言語
  context?: string;              // 使用文脈情報
  recommendation?: string;       // 代替表現推奨
  note?: string;                 // 補足説明
  regex?: string;               // 正規表現パターン（オプション）
  enabled: boolean;              // 有効/無効フラグ
  createdAt: string;            // 作成日時（ISO 8601）
  updatedAt: string;            // 更新日時（ISO 8601）
  source?: string;              // 出典・参考元
}
```

### NgWordDatabase スキーマ

```typescript
interface NgWordDatabase {
  version: string;              // データベースバージョン
  lastUpdated: string;          // 最終更新日時
  totalEntries: number;         // 総エントリ数
  categories: string[];         // カテゴリ一覧
  entries: NgWordEntry[];       // NGワードエントリ
  metadata: {
    description: string;
    maintainer: string;
    license: string;
  };
}
```

### カテゴリ分類

#### 必須カテゴリ（最低要件）

1. **差別表現** (50語以上)
   - 身体的特徴差別、民族・人種差別、性別差別、職業差別、地域差別

2. **暴力的表現** (80語以上)
   - 直接的暴力、脅迫・恫喝、武器・殺傷具、自傷・自殺関連

3. **性的表現** (60語以上)
   - 露骨な性的表現、性器名称、性行為関連、アダルト業界用語

4. **侮蔑表現** (70語以上)
   - 人格攻撃、容姿侮蔑、知性侮蔑、一般悪口

5. **政治・宗教的表現** (40語以上)
   - 政治的偏見、宗教的偏見、過激思想、ヘイトスピーチ

6. **ラップバトル不適切表現** (100語以上)
   - 実在人物誹謗中傷、個人情報言及、放送禁止用語、業界内部情報

## API仕様

### エンドポイント一覧

#### NGワード管理

```http
GET    /api/ng-words              # NGワード一覧取得
POST   /api/ng-words              # NGワード追加
GET    /api/ng-words/:id          # 特定NGワード取得
PUT    /api/ng-words/:id          # NGワード更新
DELETE /api/ng-words/:id          # NGワード削除
```

#### メタデータ・統計

```http
GET    /api/ng-words/meta/categories   # カテゴリ一覧取得
GET    /api/ng-words/meta/statistics   # 統計情報取得
```

#### データ管理

```http
POST   /api/ng-words/validate          # データベース検証
POST   /api/ng-words/import            # 一括インポート
GET    /api/ng-words/export            # 一括エクスポート
```

#### コンテンツ分析

```http
POST   /api/ng-words/analyze           # コンテンツ分析
```

### レスポンス形式

#### 成功レスポンス

```json
{
  "success": true,
  "data": {
    // レスポンスデータ
  },
  "message": "操作成功メッセージ",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "details": {
    // 詳細情報（オプション）
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### クエリパラメータ

#### 一覧取得時のフィルタリング

- `category`: カテゴリフィルタ
- `severity`: 重要度フィルタ
- `language`: 言語フィルタ
- `enabled`: 有効/無効フィルタ
- `search`: 検索クエリ
- `page`: ページ番号
- `limit`: 取得件数制限
- `sortBy`: ソート項目
- `sortOrder`: ソート順序

## Mastra MCPツール

### ngWordManagementTool

NGワードデータベースの管理・更新機能を提供します。

#### サポートアクション

- `add`: 新規エントリ追加
- `update`: エントリ更新
- `delete`: エントリ削除
- `search`: エントリ検索
- `get`: 特定エントリ取得
- `list`: エントリ一覧取得
- `validate`: データベース検証
- `statistics`: 統計情報取得

#### 使用例

```javascript
const result = await ngWordManagementTool.execute({
  context: {
    action: 'add',
    data: {
      term: '新しい禁止用語',
      category: '侮蔑表現',
      severity: 'high',
      penalty: 0.8,
      language: 'ja'
    }
  }
});
```

### contentAnalysisEnhancedTool

拡張コンテンツ分析機能を提供します。

#### 分析タイプ

- `basic`: 基本的なNGワードチェック
- `detailed`: 詳細分析（カテゴリ別集計、感情分析等）
- `realtime`: リアルタイム最適化分析

#### 使用例

```javascript
const result = await contentAnalysisEnhancedTool.execute({
  context: {
    content: '分析対象のテキスト',
    analysisType: 'detailed',
    options: {
      includeRecommendations: true,
      contextAnalysis: true,
      emotionAnalysis: true
    }
  }
});
```

## パフォーマンス仕様

### 応答速度要件

- NGワード検索: 10ms以下
- コンテンツチェック: 100ms以下（1000文字）
- データベース読み込み: 500ms以下
- API エンドポイント: 200ms以下（通常操作）

### スケーラビリティ要件

- 最大エントリ数: 10,000語
- 同時ユーザー: 1,000人
- メモリ使用量: 50MB以下
- 同時接続100ユーザーでの処理: レスポンス時間500ms以下

### 最適化手法

1. **インメモリキャッシュ**: 頻繁にアクセスされるデータのメモリ常駐
2. **インデックス**: カテゴリ・言語・重要度別の高速検索
3. **表記揺れ最適化**: 前処理による高速マッチング
4. **並列処理**: 複数エントリの同時チェック
5. **遅延読み込み**: 必要時のみデータベース読み込み

## セキュリティ仕様

### アクセス制御

1. **認証**: APIキーまたはJWTトークンによる認証
2. **認可**: ロールベースアクセス制御
   - 読み取り専用: 一般ユーザー
   - 読み書き: 管理者
   - フル権限: システム管理者
3. **レート制限**: APIアクセス頻度制限
4. **IP制限**: 許可IPアドレスからのみアクセス可能

### データ保護

1. **暗号化**: 機密データの保存時暗号化
2. **バックアップ**: 定期的な自動バックアップ
3. **バージョン管理**: 変更履歴の追跡
4. **監査ログ**: 全操作のログ記録

### 脆弱性対策

1. **入力検証**: 全入力データの厳格な検証
2. **SQLインジェクション対策**: パラメータ化クエリ使用
3. **XSS対策**: 出力データのサニタイズ
4. **CSRF対策**: CSRFトークンによる保護

## 運用手順

### 初回セットアップ

1. **依存関係インストール**
   ```bash
   npm install
   ```

2. **データベース初期化**
   ```bash
   npm run init:ngword-db
   ```

3. **サービス起動**
   ```bash
   npm run start:compliance
   ```

### 日常運用

#### データベース更新

1. **外部ソースからの更新**
   ```bash
   npm run update:ngword-db --source=bpo_guidelines
   ```

2. **手動更新**
   ```bash
   npm run import:ngword-db --file=./new_entries.json
   ```

3. **バックアップ作成**
   ```bash
   npm run backup:ngword-db
   ```

#### 監視・メンテナンス

1. **ヘルスチェック**
   ```bash
   curl -X GET http://localhost:8456/api/ng-words/meta/statistics
   ```

2. **データ整合性チェック**
   ```bash
   npm run validate:ngword-db
   ```

3. **パフォーマンス監視**
   ```bash
   npm run monitor:ngword-performance
   ```

### バックアップ・復旧

#### バックアップ手順

1. **自動バックアップ設定**
   - 日次: 午前2時に実行
   - 保存期間: 30日間
   - 保存場所: `/backups/ng-word/`

2. **手動バックアップ**
   ```bash
   npm run backup:ngword-db --manual
   ```

#### 復旧手順

1. **バックアップ一覧確認**
   ```bash
   npm run list:ngword-backups
   ```

2. **特定バージョンに復旧**
   ```bash
   npm run restore:ngword-db --version=2023-01-01T00-00-00-000Z
   ```

## トラブルシューティング

### よくある問題と解決方法

#### 1. データベース読み込みエラー

**症状**: `Database not loaded` エラー

**原因**:
- JSONファイルの破損
- ファイルパーミッション不足
- スキーマ形式不正

**解決方法**:
```bash
# ファイル整合性チェック
npm run check:ngword-db-integrity

# パーミッション修正
chmod 644 ng_word.json

# バックアップから復旧
npm run restore:ngword-db --latest
```

#### 2. パフォーマンス低下

**症状**: レスポンス時間が基準値を超過

**原因**:
- データベースサイズ肥大
- メモリ不足
- 同時接続数過多

**解決方法**:
```bash
# データベース最適化
npm run optimize:ngword-db

# メモリ使用量確認
npm run monitor:memory-usage

# 無効エントリクリーンアップ
npm run cleanup:disabled-entries
```

#### 3. 検証エラー

**症状**: データベース検証で多数のエラー

**原因**:
- 重複エントリ
- 無効なカテゴリ
- スキーマ違反

**解決方法**:
```bash
# 重複エントリ削除
npm run deduplicate:ngword-db

# カテゴリ正規化
npm run normalize:categories

# スキーマ修復
npm run repair:schema-violations
```

#### 4. MCP統合エラー

**症状**: Mastraツールが応答しない

**原因**:
- 初期化エラー
- メモリ不足
- 設定ミス

**解決方法**:
```bash
# MCP統合確認
npm run test:mcp-integration

# サービス再起動
npm run restart:compliance-services

# 設定確認
npm run verify:mcp-config
```

### ログ分析

#### ログレベル

- `ERROR`: 重大なエラー（システム停止レベル）
- `WARN`: 警告（注意が必要）
- `INFO`: 一般情報（正常動作）
- `DEBUG`: デバッグ情報（開発時のみ）

#### 重要なログパターン

```bash
# エラー系ログ
grep "ERROR.*ng-word" /var/log/app.log

# パフォーマンス警告
grep "WARN.*slow.*ng-word" /var/log/app.log

# データベース操作ログ
grep "INFO.*NgWordDatabase" /var/log/app.log
```

### 監視・アラート

#### 監視指標

1. **応答時間**
   - 平均: < 50ms
   - 95パーセンタイル: < 100ms
   - 99パーセンタイル: < 200ms

2. **エラー率**
   - 4xx エラー: < 1%
   - 5xx エラー: < 0.1%

3. **リソース使用量**
   - CPU使用率: < 70%
   - メモリ使用量: < 80%
   - ディスク使用量: < 90%

#### アラート設定

```yaml
# アラート設定例（Prometheus + Alertmanager）
groups:
  - name: ng-word-system
    rules:
      - alert: NgWordHighResponseTime
        expr: ng_word_response_time_p95 > 200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NGワードシステムの応答時間が遅延"
          
      - alert: NgWordDatabaseError
        expr: ng_word_database_errors_total > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NGワードデータベースでエラーが多発"
```

## 更新・メンテナンス履歴

### バージョン履歴

#### v1.0.0 (2023-XX-XX)
- 初回リリース
- 基本NGワードデータベース実装
- Mastra MCP統合
- RESTful API提供

#### 今後の予定

- v1.1.0: 機械学習による自動分類機能
- v1.2.0: リアルタイム更新機能強化
- v1.3.0: 多言語対応拡張（韓国語、中国語等）

### 定期メンテナンス

#### 月次作業
- データベース最適化
- バックアップ整理
- パフォーマンスレポート作成

#### 四半期作業
- 外部ソースとの同期
- セキュリティ監査
- 容量計画見直し

#### 年次作業
- システム全体見直し
- セキュリティ強化
- 次年度計画策定

---

この技術文書は、NGワードシステムの包括的な理解と適切な運用を支援するために作成されました。システムの継続的な改善・最適化にご活用ください。