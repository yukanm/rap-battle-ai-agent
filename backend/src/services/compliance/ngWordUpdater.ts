import { promises as fs } from 'fs';
import path from 'path';
import { 
  NgWordEntry, 
  UpdateResult,
  DatabaseDiff
} from '@/types/ngWord';
import { NgWordDatabase } from './ngWordDatabase';
import { NgWordValidator } from './ngWordValidator';
import { logger } from '@/utils/logger';

export class NgWordUpdater {
  private database: NgWordDatabase;
  private validator: NgWordValidator;
  private backupDir: string;

  constructor(database: NgWordDatabase) {
    this.database = database;
    this.validator = new NgWordValidator();
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  async updateFromSource(source: string): Promise<UpdateResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    try {
      // バックアップ作成
      const backupPath = await this.createBackup();

      // ソースタイプに応じた処理
      let newEntries: NgWordEntry[] = [];
      
      switch (source) {
        case 'bpo_guidelines':
          newEntries = await this.fetchBPOGuidelines();
          break;
        case 'minpaku_standards':
          newEntries = await this.fetchMinpakuStandards();
          break;
        case 'youtube_guidelines':
          newEntries = await this.fetchYouTubeGuidelines();
          break;
        case 'twitter_rules':
          newEntries = await this.fetchTwitterRules();
          break;
        case 'internet_monitoring':
          newEntries = await this.fetchInternetMonitoring();
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      // 新しいエントリの検証
      for (const entry of newEntries) {
        const validationResult = this.validator.validateEntry(entry);
        if (!validationResult.isValid) {
          errors.push(`Invalid entry ${entry.term}: ${validationResult.errors.map(e => e.message).join(', ')}`);
          continue;
        }

        try {
          const existingEntry = this.database.getEntryById(entry.id);
          if (existingEntry) {
            // 既存エントリの更新
            if (this.needsUpdate(existingEntry, entry)) {
              await this.database.updateEntry(entry.id, entry);
              updated++;
            }
          } else {
            // 新規エントリの追加
            await this.database.addEntry(entry);
            added++;
          }
        } catch (error) {
          errors.push(`Failed to process entry ${entry.term}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info(`Update from ${source} completed: ${added} added, ${updated} updated, ${deleted} deleted`);

      return {
        success: errors.length === 0,
        added,
        updated,
        deleted,
        errors,
        timestamp,
        backupPath
      };

    } catch (error) {
      logger.error(`Update from source ${source} failed:`, error);
      return {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp
      };
    }
  }

  private async fetchBPOGuidelines(): Promise<NgWordEntry[]> {
    // 放送倫理・番組向上機構（BPO）ガイドラインからのデータ取得
    // 実際の実装では外部APIやWebスクレイピングを使用
    const entries: NgWordEntry[] = [];
    const now = new Date().toISOString();

    // BPO基準の暴力的表現
    const violentTerms = [
      '殺してやる', '死ね', '殺す', '刺す', '撃つ', '爆破する', '焼き殺す',
      '首を絞める', '血まみれ', '虐殺', '拷問', '暴行', '殴る蹴る'
    ];

    for (let i = 0; i < violentTerms.length; i++) {
      entries.push({
        id: `bpo_violent_${i + 1}`,
        category: '暴力的表現',
        subcategory: 'BPO基準',
        term: violentTerms[i],
        severity: 'critical',
        penalty: 1.0,
        language: 'ja',
        context: '放送での使用を禁止',
        note: 'BPOガイドラインに該当',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'bpo_guidelines'
      });
    }

    // BPO基準の差別表現
    const discriminatoryTerms = [
      'めくら', 'つんぼ', 'おし', 'びっこ', 'かたわ', 'きちがい', '白痴',
      '精神異常', '知恵遅れ', '低能', '阿呆', '馬鹿', '間抜け'
    ];

    for (let i = 0; i < discriminatoryTerms.length; i++) {
      entries.push({
        id: `bpo_discriminatory_${i + 1}`,
        category: '差別表現',
        subcategory: 'BPO基準',
        term: discriminatoryTerms[i],
        severity: 'high',
        penalty: 0.9,
        language: 'ja',
        context: '放送での使用を禁止',
        note: 'BPOガイドラインに該当',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'bpo_guidelines'
      });
    }

    return entries;
  }

  private async fetchMinpakuStandards(): Promise<NgWordEntry[]> {
    // 日本民間放送連盟（民放連）放送基準からのデータ取得
    const entries: NgWordEntry[] = [];
    const now = new Date().toISOString();

    // 性的表現の基準
    const sexualTerms = [
      'セックス', 'エッチ', 'やらしい', 'いやらしい', 'スケベ', '変態',
      'おっぱい', 'ちんこ', 'まんこ', 'おちんちん', 'あそこ'
    ];

    for (let i = 0; i < sexualTerms.length; i++) {
      entries.push({
        id: `minpaku_sexual_${i + 1}`,
        category: '性的表現',
        subcategory: '民放連基準',
        term: sexualTerms[i],
        severity: 'critical',
        penalty: 1.0,
        language: 'ja',
        context: '放送時間帯制限',
        note: '民放連放送基準に該当',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'minpaku_standards'
      });
    }

    return entries;
  }

  private async fetchYouTubeGuidelines(): Promise<NgWordEntry[]> {
    // YouTube コミュニティガイドラインからのデータ取得
    const entries: NgWordEntry[] = [];
    const now = new Date().toISOString();

    // ヘイトスピーチ関連
    const hateTerms = [
      'kill yourself', 'die', 'murder', 'terrorist', 'nazi', 'fascist',
      'racial slur', 'ethnic slur', 'hate speech', 'discrimination'
    ];

    for (let i = 0; i < hateTerms.length; i++) {
      entries.push({
        id: `youtube_hate_${i + 1}`,
        category: '政治・宗教的表現',
        subcategory: 'ヘイトスピーチ',
        term: hateTerms[i],
        severity: 'critical',
        penalty: 1.0,
        language: 'en',
        context: 'YouTube community guidelines',
        note: 'Violates YouTube hate speech policy',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'youtube_guidelines'
      });
    }

    return entries;
  }

  private async fetchTwitterRules(): Promise<NgWordEntry[]> {
    // Twitter/X ハッシュタグ利用規約からのデータ取得
    const entries: NgWordEntry[] = [];
    const now = new Date().toISOString();

    // ハラスメント関連
    const harassmentTerms = [
      'stalker', 'harassment', 'bullying', 'doxxing', 'threat',
      'intimidation', 'abuse', 'toxic', 'troll', 'spam'
    ];

    for (let i = 0; i < harassmentTerms.length; i++) {
      entries.push({
        id: `twitter_harassment_${i + 1}`,
        category: '侮蔑表現',
        subcategory: 'ハラスメント',
        term: harassmentTerms[i],
        severity: 'high',
        penalty: 0.8,
        language: 'en',
        context: 'Twitter/X community rules',
        note: 'Violates Twitter harassment policy',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'twitter_rules'
      });
    }

    return entries;
  }

  private async fetchInternetMonitoring(): Promise<NgWordEntry[]> {
    // 一般社団法人インターネットコンテンツ審査監視機構基準からのデータ取得
    const entries: NgWordEntry[] = [];
    const now = new Date().toISOString();

    // ラップバトル特化の不適切表現
    const rapBattleTerms = [
      '実名晒し', '住所バレ', '個人情報', '暴露', 'リーク', 'ゴシップ',
      '業界人', '裏事情', '枕営業', 'コネ', '癒着', '買収'
    ];

    for (let i = 0; i < rapBattleTerms.length; i++) {
      entries.push({
        id: `internet_rapbattle_${i + 1}`,
        category: 'ラップバトル不適切表現',
        subcategory: '個人情報・業界情報',
        term: rapBattleTerms[i],
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        context: 'ラップバトルコンテンツ',
        note: 'ラップバトルでの使用を制限',
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'internet_monitoring'
      });
    }

    return entries;
  }

  async manualUpdate(updates: NgWordEntry[]): Promise<UpdateResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    try {
      // バックアップ作成
      const backupPath = await this.createBackup();

      // 各エントリの処理
      for (const entry of updates) {
        try {
          // 検証
          const validationResult = this.validator.validateEntry(entry);
          if (!validationResult.isValid) {
            errors.push(`Invalid entry ${entry.term}: ${validationResult.errors.map(e => e.message).join(', ')}`);
            continue;
          }

          const existingEntry = this.database.getEntryById(entry.id);
          if (existingEntry) {
            await this.database.updateEntry(entry.id, entry);
            updated++;
          } else {
            await this.database.addEntry(entry);
            added++;
          }
        } catch (error) {
          errors.push(`Failed to process entry ${entry.term}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info(`Manual update completed: ${added} added, ${updated} updated`);

      return {
        success: errors.length === 0,
        added,
        updated,
        deleted,
        errors,
        timestamp,
        backupPath
      };

    } catch (error) {
      logger.error('Manual update failed:', error);
      return {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp
      };
    }
  }

  async createBackup(): Promise<string> {
    try {
      // バックアップディレクトリの作成
      await fs.mkdir(this.backupDir, { recursive: true });

      // タイムスタンプ付きファイル名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `ng_word_backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // 現在のデータベースをエクスポート
      const databaseJson = this.database.exportToJson();
      await fs.writeFile(backupPath, databaseJson, 'utf-8');

      logger.info(`Backup created: ${backupPath}`);
      return backupPath;

    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  async rollback(version: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, `ng_word_backup_${version}.json`);
      
      // バックアップファイルの存在確認
      await fs.access(backupPath);

      // バックアップからデータを読み込み
      const backupData = await fs.readFile(backupPath, 'utf-8');
      
      // データベースにインポート
      await this.database.importFromJson(backupData);

      logger.info(`Rollback completed to version: ${version}`);

    } catch (error) {
      logger.error(`Rollback to version ${version} failed:`, error);
      throw error;
    }
  }

  async applyDiff(diff: DatabaseDiff): Promise<UpdateResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    try {
      // バックアップ作成
      const backupPath = await this.createBackup();

      // 追加処理
      for (const entry of diff.added) {
        try {
          const validationResult = this.validator.validateEntry(entry);
          if (!validationResult.isValid) {
            errors.push(`Invalid new entry ${entry.term}: ${validationResult.errors.map(e => e.message).join(', ')}`);
            continue;
          }

          await this.database.addEntry(entry);
          added++;
        } catch (error) {
          errors.push(`Failed to add entry ${entry.term}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 更新処理
      for (const update of diff.updated) {
        try {
          await this.database.updateEntry(update.id, update.changes);
          updated++;
        } catch (error) {
          errors.push(`Failed to update entry ${update.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 削除処理
      for (const entryId of diff.deleted) {
        try {
          await this.database.deleteEntry(entryId);
          deleted++;
        } catch (error) {
          errors.push(`Failed to delete entry ${entryId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info(`Diff applied: ${added} added, ${updated} updated, ${deleted} deleted`);

      return {
        success: errors.length === 0,
        added,
        updated,
        deleted,
        errors,
        timestamp,
        backupPath
      };

    } catch (error) {
      logger.error('Apply diff failed:', error);
      return {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp
      };
    }
  }

  private needsUpdate(existing: NgWordEntry, newEntry: NgWordEntry): boolean {
    // 重要なフィールドの変更をチェック
    return (
      existing.term !== newEntry.term ||
      existing.category !== newEntry.category ||
      existing.severity !== newEntry.severity ||
      existing.penalty !== newEntry.penalty ||
      existing.enabled !== newEntry.enabled ||
      existing.note !== newEntry.note ||
      existing.recommendation !== newEntry.recommendation ||
      JSON.stringify(existing.variants) !== JSON.stringify(newEntry.variants)
    );
  }

  async getAvailableBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith('ng_word_backup_') && file.endsWith('.json'))
        .sort()
        .reverse(); // 最新順
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  async cleanupOldBackups(keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length <= keepCount) {
        return;
      }

      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        const backupPath = path.join(this.backupDir, backup);
        await fs.unlink(backupPath);
        logger.info(`Deleted old backup: ${backup}`);
      }

    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
      throw error;
    }
  }
}