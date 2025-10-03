/**
 * Javaクラス構造を表現するデータモデル
 */

export class JavaClass {
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

        // UMLlet Generator用の便利プロパティ
        this.isInterface = type === 'interface';
        this.isAbstract = type === 'abstract' || this.modifiers.has('abstract');
        this.isEnum = type === 'enum';
        this.isFinal = this.modifiers.has('final');
    }

    /**
     * 修飾子追加後にプロパティを更新
     */
    updateProperties() {
        this.isAbstract = this.type === 'abstract' || this.modifiers.has('abstract');
        this.isFinal = this.modifiers.has('final');
    }
}

export class JavaField {
    constructor(name, type, modifiers = []) {
        this.name = name;
        this.type = type;
        this.modifiers = new Set(modifiers);
        this.defaultValue = null;

        // 便利プロパティ
        this.visibility = this.getVisibility();
        this.isStatic = this.modifiers.has('static');
        this.isFinal = this.modifiers.has('final');
    }

    getVisibility() {
        if (this.modifiers.has('public')) return 'public';
        if (this.modifiers.has('private')) return 'private';
        if (this.modifiers.has('protected')) return 'protected';
        return 'package';
    }
}

export class JavaMethod {
    constructor(name, returnType = 'void', modifiers = []) {
        this.name = name;
        this.returnType = returnType;
        this.modifiers = new Set(modifiers);
        this.parameters = [];
        this.isConstructor = false;
        this.isAbstract = this.modifiers.has('abstract');

        // 便利プロパティ
        this.visibility = this.getVisibility();
        this.isStatic = this.modifiers.has('static');
        this.isFinal = this.modifiers.has('final');
    }

    getVisibility() {
        if (this.modifiers.has('public')) return 'public';
        if (this.modifiers.has('private')) return 'private';
        if (this.modifiers.has('protected')) return 'protected';
        return 'package';
    }
}

export class JavaParameter {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}