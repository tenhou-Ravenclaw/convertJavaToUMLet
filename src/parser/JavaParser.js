/**
 * Javaソースコード解析器
 */

import { JavaClass, JavaField, JavaMethod, JavaParameter } from '../models/index.js';

export class JavaParser {
    constructor() {
        this.classes = [];
        this.imports = [];
        this.packageName = '';
        this.allRelationships = []; // 全体の関係性を格納
    }

    /**
     * Javaソースコードを解析してクラス情報を抽出
     */
    parse(sourceCode) {
        this.classes = [];
        this.imports = [];
        this.packageName = '';
        this.allRelationships = [];

        // ソースコードの前処理（コメント削除、正規化）
        const cleanCode = this.preprocessCode(sourceCode);

        // パッケージ宣言の解析
        this.parsePackage(cleanCode);

        // インポート文の解析
        this.parseImports(cleanCode);

        // クラス・インターフェース定義の解析
        this.parseClasses(cleanCode);

        return {
            packageName: this.packageName,
            imports: this.imports,
            classes: this.classes,
            relationships: this.allRelationships
        };
    }

    /**
     * ソースコードの前処理
     */
    preprocessCode(code) {
        // 文字列リテラル内の特殊文字をエスケープ（改良版）
        const stringLiterals = [];
        let stringIndex = 0;

        // 文字列リテラルを一時的に置換
        code = code.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
            stringLiterals.push(match);
            return `"STRING_LITERAL_${stringIndex++}"`;
        });

        // 文字リテラルを一時的に置換
        code = code.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
            stringLiterals.push(match);
            return `'CHAR_LITERAL_${stringIndex++}'`;
        });

        // 複数行コメントを削除
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');

        // 単行コメントを削除
        code = code.replace(/\/\/.*$/gm, '');

        // アノテーションを削除（@Overrideなど）
        code = code.replace(/@[a-zA-Z_][a-zA-Z0-9_]*(?:\([^)]*\))?/g, '');

        // 余分な空白を正規化
        code = code.replace(/\s+/g, ' ');

        return code;
    }

    /**
     * パッケージ宣言の解析
     */
    parsePackage(code) {
        const packageMatch = code.match(/package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/);
        if (packageMatch) {
            this.packageName = packageMatch[1];
        }
    }

    /**
     * インポート文の解析
     */
    parseImports(code) {
        const importPattern = /import\s+(static\s+)?([a-zA-Z_][a-zA-Z0-9_.*]*)\s*;/g;
        let match;
        while ((match = importPattern.exec(code)) !== null) {
            this.imports.push({
                isStatic: !!match[1],
                path: match[2]
            });
        }
    }

    /**
     * クラス・インターフェース定義の解析
     */
    parseClasses(code) {
        // クラス・インターフェース定義のパターン（改良版）
        const classPattern = /\b(public\s+|private\s+|protected\s+)?(abstract\s+|final\s+|static\s+)?(class|interface|enum)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*(?:extends\s+([a-zA-Z_][a-zA-Z0-9_.<>\s]*?))?\s*(?:implements\s+([^{]+?))?\s*\{/g;

        let match;
        while ((match = classPattern.exec(code)) !== null) {
            const javaClass = new JavaClass(match[4], match[3]);
            javaClass.packageName = this.packageName;

            // 修飾子の解析
            if (match[1]) javaClass.modifiers.add(match[1].trim());
            if (match[2]) javaClass.modifiers.add(match[2].trim());

            // プロパティの更新
            javaClass.updateProperties();

            // 継承関係の解析
            if (match[5]) {
                javaClass.superClass = match[5].trim();
            }

            // 実装インターフェースの解析
            if (match[6]) {
                // implementsの部分をより柔軟に解析
                const implementsText = match[6].trim();
                javaClass.interfaces = implementsText.split(',').map(i => i.trim()).filter(i => i.length > 0);
            }

            // クラス本体の解析
            const classBodyStart = match.index + match[0].length - 1;
            const classBody = this.extractClassBody(code, classBodyStart);

            this.parseClassBody(javaClass, classBody);
            this.classes.push(javaClass);
        }
    }

    /**
     * クラス本体の抽出（ネストした括弧に対応）
     */
    extractClassBody(code, startIndex) {
        let braceCount = 1;
        let i = startIndex + 1;

        while (i < code.length && braceCount > 0) {
            if (code[i] === '{') {
                braceCount++;
            } else if (code[i] === '}') {
                braceCount--;
            }
            i++;
        }

        return code.substring(startIndex + 1, i - 1);
    }

    /**
     * クラス本体の解析（フィールド・メソッド）
     */
    parseClassBody(javaClass, classBody) {
        // フィールドの解析
        this.parseFields(javaClass, classBody);

        // メソッドの解析
        this.parseMethods(javaClass, classBody);
    }

    /**
     * フィールドの解析
     */
    parseFields(javaClass, classBody) {
        // フィールド定義のパターン（改良版）- static/finalの順序に柔軟に対応
        const fieldPattern = /\b(public|private|protected)?\s*(?:(static|final)\s+)?(?:(static|final)\s+)?\s*([a-zA-Z_][a-zA-Z0-9_<>\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*[^;]+)?\s*;/g;

        let match;
        while ((match = fieldPattern.exec(classBody)) !== null) {
            // メソッド内の変数宣言を除外するため、より詳細なチェックを行う
            const beforeMatch = classBody.substring(0, match.index);
            const openBraces = (beforeMatch.match(/\{/g) || []).length;
            const closeBraces = (beforeMatch.match(/\}/g) || []).length;

            // クラスレベルのフィールドのみを対象とする
            if (openBraces === closeBraces) {
                const modifiers = [];
                if (match[1]) modifiers.push(match[1]); // visibility
                if (match[2]) modifiers.push(match[2]); // static or final
                if (match[3] && match[3] !== match[2]) modifiers.push(match[3]); // final or static (重複を避ける)

                const field = new JavaField(match[5], match[4], modifiers);
                javaClass.fields.push(field);
            }
        }
    }

    /**
     * メソッドの解析
     */
    parseMethods(javaClass, classBody) {
        // メソッド定義のパターン（改良版）- 修飾子の順序に柔軟に対応
        const methodPattern = /\b(public|private|protected)?\s*(?:(static|final|abstract)\s+)?(?:(static|final|abstract)\s+)?\s*(?:([a-zA-Z_][a-zA-Z0-9_<>\[\]]*|void)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?\s*[{;]/g;

        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            // クラス内のメソッドのみを対象とする（ネストしたクラスのメソッドを除外）
            const beforeMatch = classBody.substring(0, match.index);
            const openBraces = (beforeMatch.match(/\{/g) || []).length;
            const closeBraces = (beforeMatch.match(/\}/g) || []).length;

            if (openBraces === closeBraces) {
                const modifiers = [];
                if (match[1]) modifiers.push(match[1]); // visibility
                if (match[2]) modifiers.push(match[2]); // static, final, or abstract
                if (match[3] && match[3] !== match[2]) modifiers.push(match[3]); // 重複を避ける

                const methodName = match[5];
                const returnType = match[4]; // コンストラクタの場合はundefined
                const method = new JavaMethod(methodName, returnType, modifiers);

                // コンストラクタかどうかの判定
                method.isConstructor = (methodName === javaClass.name);
                if (method.isConstructor) {
                    method.returnType = null;
                }

                // abstract メソッドかどうかの判定
                method.isAbstract = modifiers.includes('abstract') || javaClass.type === 'interface';

                // パラメータの解析
                if (match[6].trim()) {
                    method.parameters = this.parseParameters(match[6]);
                }

                if (method.isConstructor) {
                    javaClass.constructors.push(method);
                } else {
                    javaClass.methods.push(method);
                }
            }
        }
    }

    /**
     * メソッドパラメータの解析
     */
    parseParameters(parametersString) {
        const parameters = [];
        const paramParts = parametersString.split(',');

        for (const part of paramParts) {
            const trimmed = part.trim();
            if (trimmed) {
                // final修飾子がある場合も考慮するが、修飾子は無視して型と名前のみを抽出
                const paramMatch = trimmed.match(/(?:final\s+)?([a-zA-Z_][a-zA-Z0-9_<>\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (paramMatch) {
                    // paramMatch[1] = 型, paramMatch[2] = 名前（final修飾子は無視）
                    parameters.push(new JavaParameter(paramMatch[2], paramMatch[1]));
                }
            }
        }

        return parameters;
    }

    /**
     * parseメソッドのエイリアス（APIの一貫性のため）
     */
    parseJavaCode(sourceCode) {
        const result = this.parse(sourceCode);
        return result.classes;
    }
}