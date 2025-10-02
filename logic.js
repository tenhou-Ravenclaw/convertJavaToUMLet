/**
 * Java to UMLet Converter - Logic Module
 * ソースコードからテキスト出力にする部分の詳細ロジック
 */

/**
 * Javaソースコード解析用のデータ構造
 */
// 関係性タイプの定数定義
const RELATIONSHIP_TYPES = {
    INHERITANCE: 'inheritance',          // 継承：実線三角矢印
    IMPLEMENTATION: 'implementation',    // インターフェース実装：点線三角矢印
    AGGREGATION: 'aggregation',         // 集約：実線四角白矢印
    COMPOSITION: 'composition',         // コンポジション：実線四角黒矢印
    ASSOCIATION: 'association',         // 関連：線のみ
    DEPENDENCY: 'dependency'            // 依存：点線に普通の矢印
};

// 関係性情報を格納するクラス
class Relationship {
    constructor(fromClass, toClass, type, details = {}) {
        this.fromClass = fromClass;
        this.toClass = toClass;
        this.type = type;
        this.details = details; // 追加情報（メソッド名、フィールド名など）
    }
}

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

        // 新しい関係性情報
        this.relationships = [];
        this.aggregations = []; // 集約関係
        this.compositions = []; // コンポジション関係
        this.associations = []; // 関連関係
        this.dependencies = []; // 依存関係
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

        // 関係性の解析
        this.analyzeRelationships(cleanCode);

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
        // フィールド定義のパターン（改良版）
        const fieldPattern = /\b(public|private|protected)?\s*(?:(static)\s+)?\s*(?:(final)\s+)?\s*([a-zA-Z_][a-zA-Z0-9_<>\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*[^;]+)?\s*;/g;

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
                if (match[2]) modifiers.push(match[2]); // static
                // finalは無視する

                const field = new JavaField(match[5], match[4], modifiers);
                javaClass.fields.push(field);
            }
        }
    }

    /**
     * メソッドの解析
     */
    parseMethods(javaClass, classBody) {
        // メソッド定義のパターン（改良版）- コンストラクタと通常メソッドの両方に対応
        const methodPattern = /\b(public|private|protected)?\s*(?:(static)\s+)?\s*(?:(final|abstract)\s+)?\s*(?:([a-zA-Z_][a-zA-Z0-9_<>\[\]]*|void)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?\s*[{;]/g;

        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            // クラス内のメソッドのみを対象とする（ネストしたクラスのメソッドを除外）
            const beforeMatch = classBody.substring(0, match.index);
            const openBraces = (beforeMatch.match(/\{/g) || []).length;
            const closeBraces = (beforeMatch.match(/\}/g) || []).length;

            if (openBraces === closeBraces) {
                const modifiers = [];
                if (match[1]) modifiers.push(match[1]); // visibility
                if (match[2]) modifiers.push(match[2]); // static
                // finalは無視、abstractのみ処理
                if (match[3] && match[3] === 'abstract') modifiers.push(match[3]);

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
     * 全ての関係性を解析する
     */
    analyzeRelationships(code) {
        this.allRelationships = [];

        for (const javaClass of this.classes) {
            // 継承関係の追加
            if (javaClass.superClass) {
                this.allRelationships.push(new Relationship(
                    javaClass.name,
                    javaClass.superClass,
                    RELATIONSHIP_TYPES.INHERITANCE
                ));
            }

            // 実装関係の追加
            for (const interfaceName of javaClass.interfaces) {
                this.allRelationships.push(new Relationship(
                    javaClass.name,
                    interfaceName,
                    RELATIONSHIP_TYPES.IMPLEMENTATION
                ));
            }

            // クラス本体での関係性解析
            const classBodyStart = this.findClassBodyStart(code, javaClass.name);
            if (classBodyStart !== -1) {
                const classBody = this.extractClassBodyByName(code, javaClass.name);
                this.analyzeClassRelationships(javaClass, classBody);
            }
        }
    }

    /**
     * クラス本体の開始位置を検索
     */
    findClassBodyStart(code, className) {
        const classPattern = new RegExp(`\\b(?:class|interface|enum)\\s+${className}\\s*(?:<[^>]*>)?[^{]*\\{`, 'g');
        const match = classPattern.exec(code);
        return match ? match.index + match[0].length - 1 : -1;
    }

    /**
     * クラス名でクラス本体を抽出
     */
    extractClassBodyByName(code, className) {
        const startIndex = this.findClassBodyStart(code, className);
        if (startIndex === -1) return '';
        return this.extractClassBody(code, startIndex);
    }

    /**
     * 個別クラスの関係性を解析
     */
    analyzeClassRelationships(javaClass, classBody) {
        // コンストラクタとメソッドを分けて解析
        const constructorBodies = this.extractConstructorBodies(classBody, javaClass.name);
        const methodBodies = this.extractMethodBodies(classBody);

        // コンポジション関係（コンストラクタ内でのnew演算子）を検出
        for (const constructorBody of constructorBodies) {
            this.findCompositionRelationships(javaClass.name, constructorBody);
        }

        // 集約関係（コンストラクタ以外でのnew演算子）を検出
        for (const methodBody of methodBodies) {
            this.findAggregationRelationships(javaClass.name, methodBody);
        }

        // 依存関係（メソッド引数での使用）を検出
        this.findDependencyRelationships(javaClass, classBody);

        // 関連関係（フィールドでの参照）を検出
        this.findAssociationRelationships(javaClass, classBody);
    }

    /**
     * コンストラクタ本体の抽出
     */
    extractConstructorBodies(classBody, className) {
        const constructorBodies = [];
        const constructorPattern = new RegExp(
            `\\b(?:public|private|protected)?\\s*${className}\\s*\\([^)]*\\)\\s*\\{`, 'g'
        );

        let match;
        while ((match = constructorPattern.exec(classBody)) !== null) {
            const bodyStart = match.index + match[0].length - 1;
            const body = this.extractMethodBody(classBody, bodyStart);
            if (body) {
                constructorBodies.push(body);
            }
        }

        return constructorBodies;
    }

    /**
     * メソッド本体の抽出
     */
    extractMethodBodies(classBody) {
        const methodBodies = [];
        const methodPattern = /\b(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+|abstract\s+)?\s*(?:[a-zA-Z_][a-zA-Z0-9_<>\[\]]*|void)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/g;

        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            const bodyStart = match.index + match[0].length - 1;
            const body = this.extractMethodBody(classBody, bodyStart);
            if (body) {
                methodBodies.push(body);
            }
        }

        return methodBodies;
    }

    /**
     * メソッド本体の抽出（ネストした括弧に対応）
     */
    extractMethodBody(code, startIndex) {
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

        return braceCount === 0 ? code.substring(startIndex + 1, i - 1) : '';
    }

    /**
     * コンポジション関係の検出
     */
    findCompositionRelationships(className, constructorBody) {
        const newPattern = /new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;

        while ((match = newPattern.exec(constructorBody)) !== null) {
            const targetClass = match[1];
            // 基本型やString、コレクション類は除外
            if (!this.isBasicType(targetClass)) {
                this.allRelationships.push(new Relationship(
                    className,
                    targetClass,
                    RELATIONSHIP_TYPES.COMPOSITION,
                    { location: 'constructor' }
                ));
            }
        }
    }

    /**
     * 集約関係の検出
     */
    findAggregationRelationships(className, methodBody) {
        const newPattern = /new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;

        while ((match = newPattern.exec(methodBody)) !== null) {
            const targetClass = match[1];
            // 基本型やString、コレクション類は除外
            if (!this.isBasicType(targetClass)) {
                // 既にコンポジション関係がある場合は除外
                const hasComposition = this.allRelationships.some(rel =>
                    rel.fromClass === className &&
                    rel.toClass === targetClass &&
                    rel.type === RELATIONSHIP_TYPES.COMPOSITION
                );

                if (!hasComposition) {
                    this.allRelationships.push(new Relationship(
                        className,
                        targetClass,
                        RELATIONSHIP_TYPES.AGGREGATION,
                        { location: 'method' }
                    ));
                }
            }
        }
    }

    /**
     * 依存関係の検出（メソッド引数）
     */
    findDependencyRelationships(javaClass, classBody) {
        for (const method of javaClass.methods) {
            for (const parameter of method.parameters) {
                const paramType = this.extractBaseType(parameter.type);
                if (!this.isBasicType(paramType)) {
                    // 既に他の関係がある場合は除外
                    const hasOtherRelation = this.allRelationships.some(rel =>
                        rel.fromClass === javaClass.name &&
                        rel.toClass === paramType &&
                        rel.type !== RELATIONSHIP_TYPES.DEPENDENCY
                    );

                    if (!hasOtherRelation) {
                        this.allRelationships.push(new Relationship(
                            javaClass.name,
                            paramType,
                            RELATIONSHIP_TYPES.DEPENDENCY,
                            { method: method.name, parameter: parameter.name }
                        ));
                    }
                }
            }
        }
    }

    /**
     * 関連関係の検出（フィールド参照）
     */
    findAssociationRelationships(javaClass, classBody) {
        for (const field of javaClass.fields) {
            const fieldType = this.extractBaseType(field.type);
            if (!this.isBasicType(fieldType)) {
                // 既に他の関係がある場合は除外
                const hasOtherRelation = this.allRelationships.some(rel =>
                    rel.fromClass === javaClass.name &&
                    rel.toClass === fieldType
                );

                if (!hasOtherRelation) {
                    this.allRelationships.push(new Relationship(
                        javaClass.name,
                        fieldType,
                        RELATIONSHIP_TYPES.ASSOCIATION,
                        { field: field.name }
                    ));
                }
            }
        }
    }

    /**
     * 基本型かどうかの判定
     */
    isBasicType(typeName) {
        const basicTypes = [
            'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short',
            'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short',
            'String', 'Object', 'BigDecimal', 'BigInteger',
            'List', 'ArrayList', 'LinkedList', 'Set', 'HashSet', 'LinkedHashSet', 'TreeSet',
            'Map', 'HashMap', 'LinkedHashMap', 'TreeMap', 'Collection', 'Queue', 'Deque',
            'Math', 'System', 'Thread'
        ];
        return basicTypes.includes(typeName);
    }

    /**
     * ジェネリクスや配列から基本型を抽出
     */
    extractBaseType(type) {
        // ジェネリクス記号を除去
        let baseType = type.replace(/<.*>/g, '');
        // 配列記号を除去
        baseType = baseType.replace(/\[\]/g, '');
        return baseType.trim();
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
        } else if (javaClass.type === 'enum') {
            output += '<<enumeration>>\n';
        }

        // クラス名
        const classNameLine = javaClass.modifiers.has('abstract') ? `/${javaClass.name}/` : javaClass.name;
        output += `${classNameLine}\n`;
        output += '--\n';

        // フィールド
        if (javaClass.fields.length > 0) {
            for (const field of javaClass.fields) {
                const visibility = UMLetGenerator.getVisibilitySymbol(field.modifiers);
                let fieldLine = `${visibility} ${field.name} : ${field.type}`;

                // staticの場合のみ行全体を囲む
                if (field.modifiers.has('static')) {
                    fieldLine = `_${fieldLine}_`;
                }

                output += `${fieldLine}\n`;
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
            const params = method.parameters.map(p => `${p.name} : ${p.type}`).join(', ');
            const returnType = method.returnType || 'void';
            let methodLine = `${visibility} ${method.name}(${params}) : ${returnType}`;

            // abstractの場合は斜線で挟む
            if (method.isAbstract) {
                methodLine = `/${methodLine}/`;
            }

            // staticの場合はアンダースコアで挟む
            const finalMethodLine = method.modifiers.has('static') ? `_${methodLine}_` : methodLine;
            output += `${finalMethodLine}\n`;
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
        return '~'; // デフォルトはpackage-private
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

    /**
     * クラス間の関係線生成（人間が読みやすい形式）
     */
    static generateRelationshipsHumanReadable(parseResult) {
        let output = '';
        let relationshipCount = 0;

        // parseResultから関係性を取得
        const relationships = parseResult.relationships || [];
        const classes = parseResult.classes || [];

        // 古い方式もサポート（後方互換性）
        if (relationships.length === 0) {
            return UMLetGenerator.generateRelationshipsHumanReadableOld(classes);
        }

        // 関係性タイプ別にグループ化
        const groupedRelationships = {
            [RELATIONSHIP_TYPES.INHERITANCE]: [],
            [RELATIONSHIP_TYPES.IMPLEMENTATION]: [],
            [RELATIONSHIP_TYPES.COMPOSITION]: [],
            [RELATIONSHIP_TYPES.AGGREGATION]: [],
            [RELATIONSHIP_TYPES.ASSOCIATION]: [],
            [RELATIONSHIP_TYPES.DEPENDENCY]: []
        };

        // 関係性をタイプ別に分類
        for (const rel of relationships) {
            if (groupedRelationships[rel.type]) {
                groupedRelationships[rel.type].push(rel);
            }
        }

        // 各関係性タイプを表示
        // 1. 継承関係
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.INHERITANCE]) {
            relationshipCount++;
            output += `${relationshipCount}. 継承関係:\n`;
            output += `   ${rel.fromClass} ───▷ ${rel.toClass}\n`;
            output += `   （実線三角矢印：継承関係）\n\n`;
        }

        // 2. インターフェース実装
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.IMPLEMENTATION]) {
            relationshipCount++;
            output += `${relationshipCount}. インターフェース実装:\n`;
            output += `   ${rel.fromClass} ┈┈┈▷ ${rel.toClass}\n`;
            output += `   （点線三角矢印：インターフェース実装）\n\n`;
        }

        // 3. コンポジション（コンストラクタ内でのオブジェクト生成）
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.COMPOSITION]) {
            relationshipCount++;
            output += `${relationshipCount}. コンポジション:\n`;
            output += `   ${rel.fromClass} ───◆ ${rel.toClass}\n`;
            output += `   （実線四角黒矢印：委譲（コンポジション））\n`;
            if (rel.details?.location) {
                output += `   - コンストラクタ内でのオブジェクト生成\n`;
            }
            output += `\n`;
        }

        // 4. 集約（コンストラクタ以外でのオブジェクト生成）
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.AGGREGATION]) {
            relationshipCount++;
            output += `${relationshipCount}. 集約:\n`;
            output += `   ${rel.fromClass} ───◇ ${rel.toClass}\n`;
            output += `   （実線四角白矢印：委譲（集約））\n`;
            if (rel.details?.location) {
                output += `   - メソッド内でのオブジェクト生成\n`;
            }
            output += `\n`;
        }

        // 5. 関連（フィールド参照）
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.ASSOCIATION]) {
            relationshipCount++;
            output += `${relationshipCount}. 関連:\n`;
            output += `   ${rel.fromClass} ───── ${rel.toClass}\n`;
            output += `   （線のみ：関連関係）\n`;
            if (rel.details?.field) {
                output += `   - フィールド: ${rel.details.field}\n`;
            }
            output += `\n`;
        }

        // 6. 依存（メソッド引数での使用）
        for (const rel of groupedRelationships[RELATIONSHIP_TYPES.DEPENDENCY]) {
            relationshipCount++;
            output += `${relationshipCount}. 依存:\n`;
            output += `   ${rel.fromClass} ┈┈┈→ ${rel.toClass}\n`;
            output += `   （点線に普通の矢印：依存関係）\n`;
            if (rel.details?.method && rel.details?.parameter) {
                output += `   - メソッド: ${rel.details.method}(${rel.details.parameter})\n`;
            }
            output += `\n`;
        }

        if (relationshipCount === 0) {
            output = 'クラス間の関係性は見つかりませんでした。\n\n';
            output += '確認ポイント:\n';
            output += '- extends キーワードによる継承関係\n';
            output += '- implements キーワードによるインターフェース実装\n';
            output += '- new演算子によるオブジェクト生成（集約・コンポジション）\n';
            output += '- フィールドでの他クラス参照（関連）\n';
            output += '- メソッド引数での他クラス使用（依存）\n';
        } else {
            // サマリーを先頭に追加
            const summary = `■ 関係線の概要\n`;
            const summaryContent = `発見された関係性: ${relationshipCount}個\n\n`;
            output = summary + summaryContent + output;
        }

        return output;
    }

    /**
     * 古い形式の関係性生成（後方互換性）
     */
    static generateRelationshipsHumanReadableOld(classes) {
        let output = '';
        let relationshipCount = 0;

        for (const javaClass of classes) {
            // 継承関係
            if (javaClass.superClass) {
                relationshipCount++;
                output += `${relationshipCount}. 継承関係:\n`;
                output += `   ${javaClass.name} ───▷ ${javaClass.superClass}\n`;
                output += `   （実線の三角矢印：継承関係）\n\n`;
            }

            // 実装関係
            for (const interfaceName of javaClass.interfaces) {
                relationshipCount++;
                output += `${relationshipCount}. 実装関係:\n`;
                output += `   ${javaClass.name} ┈┈┈▷ ${interfaceName}\n`;
                output += `   （点線の三角矢印：実装関係）\n\n`;
            }
        }

        if (relationshipCount === 0) {
            output = 'クラス間の関係性は見つかりませんでした。\n\n';
            output += '確認ポイント:\n';
            output += '- extends キーワードによる継承関係\n';
            output += '- implements キーワードによるインターフェース実装\n';
        } else {
            // サマリーを先頭に追加
            const summary = `■ 関係線の概要\n`;
            const summaryContent = `発見された関係性: ${relationshipCount}個\n\n`;
            output = summary + summaryContent + output;
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

        return parseResult;
    }

    /**
     * クラス定義のみを生成（コメントなし）
     */
    generateClassDefinitions(parseResult) {
        let output = '';

        // 各クラス・インターフェースの出力
        for (const javaClass of parseResult.classes) {
            output += UMLetGenerator.generateClassText(javaClass) + '\n\n';
        }

        return output.trim();
    }

    /**
     * 関係線定義のみを生成（コメントなし）
     */
    generateRelationshipDefinitions(parseResult) {
        // クラスが存在しない場合のみエラーメッセージ
        if (parseResult.classes.length === 0) {
            return '関係線はありません（クラスが見つかりません）';
        }

        return UMLetGenerator.generateRelationshipsHumanReadable(parseResult).trim();
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
        JavaToUMLetConverter,
        Relationship,
        RELATIONSHIP_TYPES
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
        JavaToUMLetConverter,
        Relationship,
        RELATIONSHIP_TYPES
    };
}