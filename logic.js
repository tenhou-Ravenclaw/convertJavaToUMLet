/**
 * Java to UMLet Converter - Logic Module
 * ソースコードからテキスト出力にする部分の詳細ロジック
 */

/**
 * Javaソースコード解析用のデータ構造
 */
class JavaClass {
    constructor(name, type = 'class') {
        this.name = name;
        this.type = type; // 'class', 'interface', 'abstract', 'enum'
        this.packageName = '';
        this.modifiers = new Set(); // public, private, protected, static, final, abstract
        this.fields = [];
        this.methods = [];
        this.constructors = [];
        this.superClass = null;
        this.interfaces = [];
        this.innerClasses = [];
    }
}

class JavaField {
    constructor(name, type, modifiers = []) {
        this.name = name;
        this.type = type;
        this.modifiers = new Set(modifiers);
        this.defaultValue = null;
    }
}

class JavaMethod {
    constructor(name, returnType = 'void', modifiers = []) {
        this.name = name;
        this.returnType = returnType;
        this.modifiers = new Set(modifiers);
        this.parameters = [];
        this.isConstructor = false;
        this.isAbstract = false;
    }
}

class JavaParameter {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}

/**
 * Javaソースコード解析器
 */
class JavaParser {
    constructor() {
        this.classes = [];
        this.imports = [];
        this.packageName = '';
    }

    /**
     * Javaソースコードを解析してクラス情報を抽出
     */
    parse(sourceCode) {
        this.classes = [];
        this.imports = [];
        this.packageName = '';

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
            classes: this.classes
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
        const classPattern = /\b(public\s+|private\s+|protected\s+)?(abstract\s+|final\s+|static\s+)?(class|interface|enum)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*(?:extends\s+([a-zA-Z_][a-zA-Z0-9_.<>]*))?\s*(?:implements\s+([a-zA-Z_][a-zA-Z0-9_.<>,\s]*))?\s*\{/g;

        let match;
        while ((match = classPattern.exec(code)) !== null) {
            const javaClass = new JavaClass(match[4], match[3]);
            javaClass.packageName = this.packageName;

            // 修飾子の解析
            if (match[1]) javaClass.modifiers.add(match[1].trim());
            if (match[2]) javaClass.modifiers.add(match[2].trim());

            // 継承関係の解析
            if (match[5]) {
                javaClass.superClass = match[5].trim();
            }

            // 実装インターフェースの解析
            if (match[6]) {
                javaClass.interfaces = match[6].split(',').map(i => i.trim());
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
        // フィールド定義のパターン（改良版）
        const fieldPattern = /\b(public|private|protected)?\s*(static|final)?\s*([a-zA-Z_][a-zA-Z0-9_<>\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*[^;]+)?\s*;/g;

        let match;
        while ((match = fieldPattern.exec(classBody)) !== null) {
            // メソッド内の変数宣言を除外するため、より詳細なチェックを行う
            const beforeMatch = classBody.substring(0, match.index);
            const openBraces = (beforeMatch.match(/\{/g) || []).length;
            const closeBraces = (beforeMatch.match(/\}/g) || []).length;

            // クラスレベルのフィールドのみを対象とする
            if (openBraces === closeBraces) {
                const modifiers = [];
                if (match[1]) modifiers.push(match[1]);
                if (match[2]) modifiers.push(match[2]);

                const field = new JavaField(match[4], match[3], modifiers);
                javaClass.fields.push(field);
            }
        }
    }

    /**
     * メソッドの解析
     */
    parseMethods(javaClass, classBody) {
        // メソッド定義のパターン（改良版）
        const methodPattern = /\b(public|private|protected)?\s*(static|final|abstract)?\s*([a-zA-Z_][a-zA-Z0-9_<>\[\]]*|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?\s*[{;]/g;

        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            // クラス内のメソッドのみを対象とする（ネストしたクラスのメソッドを除外）
            const beforeMatch = classBody.substring(0, match.index);
            const openBraces = (beforeMatch.match(/\{/g) || []).length;
            const closeBraces = (beforeMatch.match(/\}/g) || []).length;

            if (openBraces === closeBraces) {
                const modifiers = [];
                if (match[1]) modifiers.push(match[1]);
                if (match[2]) modifiers.push(match[2]);

                const method = new JavaMethod(match[4], match[3], modifiers);

                // コンストラクタかどうかの判定
                method.isConstructor = (match[4] === javaClass.name);
                if (method.isConstructor) {
                    method.returnType = null;
                }

                // abstract メソッドかどうかの判定
                method.isAbstract = modifiers.includes('abstract') || javaClass.type === 'interface';

                // パラメータの解析
                if (match[5].trim()) {
                    method.parameters = this.parseParameters(match[5]);
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
                const paramMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_<>\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (paramMatch) {
                    parameters.push(new JavaParameter(paramMatch[2], paramMatch[1]));
                }
            }
        }

        return parameters;
    }
}

/**
 * UMLet出力ジェネレーター
 */
class UMLetGenerator {
    /**
     * パース結果からUMLetテキストを生成
     */
    static generateUMLetText(parseResult) {
        let output = '';

        // ヘッダーコメント
        output += '// UMLet Text Output (UMLetにコピペする内容)\n';
        if (parseResult.packageName) {
            output += `// Package: ${parseResult.packageName}\n`;
        }
        output += '// --- クラス定義 ---\n\n';

        // 各クラス・インターフェースの出力
        for (const javaClass of parseResult.classes) {
            output += UMLetGenerator.generateClassText(javaClass) + '\n\n';
        }

        // 関係線の生成
        if (parseResult.classes.length > 1) {
            output += '// --- 関係線（継承・実装）定義 ---\n\n';
            output += UMLetGenerator.generateRelationships(parseResult.classes);
        }

        return output;
    }

    /**
     * 個別クラスのUMLetテキスト生成
     */
    static generateClassText(javaClass) {
        let output = '';

        // クラス/インターフェースの種類表示
        if (javaClass.type === 'interface') {
            output += '<<interface>>\n';
        } else if (javaClass.modifiers.has('abstract')) {
            output += '<<abstract>>\n';
        } else if (javaClass.type === 'enum') {
            output += '<<enumeration>>\n';
        }

        // クラス名
        output += `${javaClass.name}\n`;
        output += '--\n';

        // フィールド
        if (javaClass.fields.length > 0) {
            for (const field of javaClass.fields) {
                const visibility = UMLetGenerator.getVisibilitySymbol(field.modifiers);
                const staticModifier = field.modifiers.has('static') ? ' {static}' : '';
                const finalModifier = field.modifiers.has('final') ? ' {final}' : '';
                const modifiers = staticModifier + finalModifier;
                output += `${visibility} ${field.name} : ${field.type}${modifiers}\n`;
            }
        } else {
            // フィールドがない場合は空行を追加
            output += '\n';
        }

        output += '--\n';

        // コンストラクタ
        for (const constructor of javaClass.constructors) {
            const visibility = UMLetGenerator.getVisibilitySymbol(constructor.modifiers);
            const params = constructor.parameters.map(p => `${p.name} : ${p.type}`).join(', ');
            output += `${visibility} ${constructor.name}(${params})\n`;
        }

        // メソッド
        for (const method of javaClass.methods) {
            const visibility = UMLetGenerator.getVisibilitySymbol(method.modifiers);
            const staticModifier = method.modifiers.has('static') ? ' {static}' : '';
            const abstractModifier = method.isAbstract ? ' {abstract}' : '';
            const finalModifier = method.modifiers.has('final') ? ' {final}' : '';
            const params = method.parameters.map(p => `${p.name} : ${p.type}`).join(', ');
            const modifiers = staticModifier + abstractModifier + finalModifier;
            const returnType = method.returnType || 'void';
            output += `${visibility} ${method.name}(${params}) : ${returnType}${modifiers}\n`;
        }

        // メソッドまたはコンストラクタがない場合は空行を追加
        if (javaClass.methods.length === 0 && javaClass.constructors.length === 0) {
            output += '\n';
        }

        return output.trim();
    }

    /**
     * 可視性記号の取得
     */
    static getVisibilitySymbol(modifiers) {
        if (modifiers.has('private')) return '-';
        if (modifiers.has('protected')) return '#';
        if (modifiers.has('public')) return '+';
        return '+'; // デフォルトはpublic
    }

    /**
     * クラス間の関係線生成
     */
    static generateRelationships(classes) {
        let output = '';

        for (const javaClass of classes) {
            // 継承関係
            if (javaClass.superClass) {
                output += `// ${javaClass.name} extends ${javaClass.superClass}\n`;
                output += `type=lt=<|-\n`;
                output += `${javaClass.superClass}\n`;
                output += `${javaClass.name}\n\n`;
            }

            // 実装関係
            for (const interfaceName of javaClass.interfaces) {
                output += `// ${javaClass.name} implements ${interfaceName}\n`;
                output += `type=lt=<<|..\n`;
                output += `${interfaceName}\n`;
                output += `${javaClass.name}\n\n`;
            }
        }

        return output;
    }
}

/**
 * Java to UMLet Converter のメインクラス
 */
class JavaToUMLetConverter {
    constructor() {
        this.parser = new JavaParser();
    }

    /**
     * Javaソースコードを解析してUMLetテキストに変換
     */
    convert(javaSourceCode) {
        // 入力チェック
        if (!javaSourceCode || !javaSourceCode.trim()) {
            throw new Error('Javaソースコードを入力してください。');
        }

        // Java コードをパース
        const parseResult = this.parser.parse(javaSourceCode);

        // パース結果が空の場合のチェック
        if (parseResult.classes.length === 0) {
            const debugInfo = {
                packageName: parseResult.packageName || '(なし)',
                importCount: parseResult.imports.length
            };
            throw new Error(`クラスまたはインターフェースが見つかりませんでした。\n\n確認事項:\n- クラス宣言が正しい構文で記述されているか\n- public/private修飾子が適切に配置されているか\n- 括弧の対応が正しいか\n\nデバッグ情報:\nパッケージ: ${debugInfo.packageName}\nインポート数: ${debugInfo.importCount}`);
        }

        // UMLetテキストを生成
        return UMLetGenerator.generateUMLetText(parseResult);
    }

    /**
     * パース結果のみを取得（デバッグ用）
     */
    parseOnly(javaSourceCode) {
        return this.parser.parse(javaSourceCode);
    }
}

// モジュールをエクスポート（ブラウザ環境では window オブジェクトに追加）
if (typeof module !== 'undefined' && module.exports) {
    // Node.js環境
    module.exports = {
        JavaClass,
        JavaField,
        JavaMethod,
        JavaParameter,
        JavaParser,
        UMLetGenerator,
        JavaToUMLetConverter
    };
} else {
    // ブラウザ環境
    window.JavaToUMLet = {
        JavaClass,
        JavaField,
        JavaMethod,
        JavaParameter,
        JavaParser,
        UMLetGenerator,
        JavaToUMLetConverter
    };
}