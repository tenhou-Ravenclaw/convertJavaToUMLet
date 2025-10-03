/**
 * Java to UMLet Converter - メインエントリーポイント
 * モジュラー構造でJavaソースコードをUMLet形式に変換
 */

import { JavaParser } from './parser/JavaParser.js';
import { RelationshipAnalyzer } from './parser/RelationshipAnalyzer.js';
import { UMLletGenerator } from './generator/index.js';

/**
 * Java to UMLet 変換器のメインクラス
 */
export class JavaToUMLletConverter {
    constructor() {
        this.parser = new JavaParser();
        this.relationshipAnalyzer = new RelationshipAnalyzer();
        this.generator = new UMLletGenerator();
    }

    /**
     * Javaコードを解析してUMLet形式のテキストを生成
     * @param {string} javaCode - 解析するJavaソースコード
     * @param {Object} options - 生成オプション
     * @returns {Object} 解析結果とUMLetテキスト
     */
    convert(javaCode, options = {}) {
        try {
            // 1. Javaコードを解析
            const classes = this.parser.parseJavaCode(javaCode);

            // 2. クラス間の関係性を解析
            const relationships = this.relationshipAnalyzer.analyzeRelationships(javaCode, classes);

            // 3. UMLet形式のテキストを生成
            const umlText = this.generator.generateUMLet(classes, relationships, options);

            // 4. 簡易表示用の関係性テキストも生成
            const relationshipText = this.generator.generateSimpleRelationshipText(relationships);

            return {
                success: true,
                classes: classes,
                relationships: relationships,
                umlText: umlText,
                relationshipText: relationshipText,
                summary: {
                    classCount: classes.length,
                    relationshipCount: relationships.length,
                    fieldCount: classes.reduce((sum, cls) => sum + cls.fields.length, 0),
                    methodCount: classes.reduce((sum, cls) => sum + cls.methods.length, 0)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                classes: [],
                relationships: [],
                umlText: '',
                relationshipText: '',
                summary: {
                    classCount: 0,
                    relationshipCount: 0,
                    fieldCount: 0,
                    methodCount: 0
                }
            };
        }
    }

    /**
     * 解析のみを実行（UMLet生成なし）
     * @param {string} javaCode - 解析するJavaソースコード
     * @returns {Object} 解析結果
     */
    analyze(javaCode) {
        try {
            const classes = this.parser.parseJavaCode(javaCode);
            const relationships = this.relationshipAnalyzer.analyzeRelationships(javaCode, classes);

            return {
                success: true,
                classes: classes,
                relationships: relationships
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                classes: [],
                relationships: []
            };
        }
    }

    /**
     * デバッグ情報を含む詳細な解析結果を取得
     * @param {string} javaCode - 解析するJavaソースコード
     * @returns {Object} 詳細な解析結果
     */
    analyzeDetailed(javaCode) {
        const result = this.analyze(javaCode);

        if (result.success) {
            result.debug = {
                parsedClasses: result.classes.map(cls => ({
                    name: cls.name,
                    type: cls.isInterface ? 'interface' : cls.isEnum ? 'enum' : 'class',
                    fieldCount: cls.fields.length,
                    methodCount: cls.methods.length,
                    superClass: cls.superClass,
                    interfaces: cls.interfaces
                })),
                relationshipsByType: this.generator.groupRelationshipsByType(result.relationships)
            };
        }

        return result;
    }
}

/**
 * グローバル関数として使用するためのコンバーター
 */
let globalConverter = null;

/**
 * グローバルコンバーターのインスタンスを取得
 */
export function getConverter() {
    if (!globalConverter) {
        globalConverter = new JavaToUMLletConverter();
    }
    return globalConverter;
}

/**
 * 簡易変換関数（従来のAPIとの互換性のため）
 * @param {string} javaCode - Javaソースコード
 * @returns {string} UMLet形式のテキスト
 */
export function convertJavaToUMLet(javaCode) {
    const converter = getConverter();
    const result = converter.convert(javaCode);
    return result.success ? result.umlText : `エラー: ${result.error}`;
}

/**
 * 関係性テキスト生成関数（従来のAPIとの互換性のため）
 * @param {string} javaCode - Javaソースコード
 * @returns {string} 関係性テキスト
 */
export function generateRelationshipText(javaCode) {
    const converter = getConverter();
    const result = converter.convert(javaCode);
    return result.success ? result.relationshipText : `エラー: ${result.error}`;
}

// デフォルトエクスポート
export default JavaToUMLletConverter;