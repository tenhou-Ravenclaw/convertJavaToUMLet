/**
 * クラス間の関係性解析器
 */

import { Relationship, RELATIONSHIP_TYPES } from '../models/index.js';
import { isBasicType, extractBaseType } from '../utils/index.js';
import { extractMethodBody } from '../utils/index.js';

export class RelationshipAnalyzer {
    constructor() {
        this.allRelationships = [];
    }

    /**
     * 全ての関係性を解析する
     */
    analyzeRelationships(code, classes) {
        this.allRelationships = [];

        for (const javaClass of classes) {
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

        return this.allRelationships;
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
     * 個別クラスの関係性を解析
     */
    analyzeClassRelationships(javaClass, classBody) {
        // フィールドに基づく所有関係（コンポジション・集約）を検出
        this.findOwnershipRelationships(javaClass, classBody);

        // 依存関係（メソッド引数での使用）を検出
        this.findDependencyRelationships(javaClass, classBody);

        // 関連関係（フィールドでの参照）は表示しない
        // this.findAssociationRelationships(javaClass, classBody);
    }

    /**
     * 所有関係（コンポジション・集約）の検出
     * フィールドで宣言されているクラスに対してのみ適用
     */
    findOwnershipRelationships(javaClass, classBody) {
        // フィールドで宣言されているクラス型を取得
        const fieldTypes = new Set();
        for (const field of javaClass.fields) {
            const fieldType = extractBaseType(field.type);
            if (!isBasicType(fieldType)) {
                fieldTypes.add(fieldType);
            }
        }

        if (fieldTypes.size === 0) {
            return; // フィールドがない場合は所有関係なし
        }

        // コンストラクタ本体を取得してコンポジション関係を検出
        const constructorBodies = this.extractConstructorBodies(classBody, javaClass.name);
        for (const constructorBody of constructorBodies) {
            this.findCompositionInConstructor(javaClass.name, constructorBody, fieldTypes);
        }

        // コンストラクタ引数として受け取るオブジェクトを集約関係として検出
        this.findAggregationFromConstructorParameters(javaClass, fieldTypes);

        // メソッド本体を取得して集約関係を検出
        const methodBodies = this.extractMethodBodies(classBody, javaClass.name);
        for (const methodBody of methodBodies) {
            this.findAggregationInMethods(javaClass.name, methodBody, fieldTypes);
        }

        // フィールドのみの関連関係は表示しない
        // this.findFieldOnlyAssociation(javaClass, fieldTypes);
    }

    /**
     * コンストラクタ引数として受け取るオブジェクトを集約関係として検出
     */
    findAggregationFromConstructorParameters(javaClass, fieldTypes) {
        // コンストラクタの引数を調べる（constructorsとmethodsの両方をチェック）
        const allConstructors = [...(javaClass.constructors || []), ...javaClass.methods.filter(m => m.isConstructor)];

        for (const constructor of allConstructors) {
            for (const parameter of constructor.parameters) {
                const paramType = extractBaseType(parameter.type);

                // フィールドで宣言されているクラス型で、コンストラクタ引数として受け取る場合は集約
                if (fieldTypes.has(paramType)) {
                    this.allRelationships.push(new Relationship(
                        javaClass.name,
                        paramType,
                        RELATIONSHIP_TYPES.AGGREGATION,
                        { location: 'constructor-parameter', parameter: parameter.name, hasField: true }
                    ));

                    // このクラスは処理済みとしてマーク
                    fieldTypes.delete(paramType);
                }
            }
        }
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
     * メソッド本体の抽出（コンストラクタを除外）
     */
    extractMethodBodies(classBody, className) {
        const methodBodies = [];
        // コンストラクタを除外するため、戻り値の型が必須のパターンを使用
        const methodPattern = /\b(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+|abstract\s+)?\s*([a-zA-Z_][a-zA-Z0-9_<>\[\]]*|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/g;

        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            const returnType = match[1];
            const methodName = match[2];

            // コンストラクタでないことを確認（メソッド名がクラス名と同じ場合はコンストラクタ）
            if (methodName !== className) {
                const bodyStart = match.index + match[0].length - 1;
                const body = this.extractMethodBody(classBody, bodyStart);
                if (body) {
                    methodBodies.push(body);
                }
            }
        }

        return methodBodies;
    }

    /**
     * メソッド本体の抽出（ネストした括弧に対応）
     */
    extractMethodBody(code, startIndex) {
        return extractMethodBody(code, startIndex);
    }

    /**
     * コンストラクタ内でのコンポジション関係検出
     */
    findCompositionInConstructor(className, constructorBody, fieldTypes) {
        const newPattern = /new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;

        while ((match = newPattern.exec(constructorBody)) !== null) {
            const targetClass = match[1];

            // フィールドで宣言されているクラスのみコンポジション対象
            if (fieldTypes.has(targetClass)) {
                this.allRelationships.push(new Relationship(
                    className,
                    targetClass,
                    RELATIONSHIP_TYPES.COMPOSITION,
                    { location: 'constructor', hasField: true }
                ));

                // このクラスは処理済みとしてマーク
                fieldTypes.delete(targetClass);
            }
        }
    }

    /**
     * メソッド内での集約関係検出
     */
    findAggregationInMethods(className, methodBody, fieldTypes) {
        const newPattern = /new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match;

        while ((match = newPattern.exec(methodBody)) !== null) {
            const targetClass = match[1];

            // フィールドで宣言されているクラスのみ集約対象
            if (fieldTypes.has(targetClass)) {
                this.allRelationships.push(new Relationship(
                    className,
                    targetClass,
                    RELATIONSHIP_TYPES.AGGREGATION,
                    { location: 'method', hasField: true }
                ));

                // このクラスは処理済みとしてマーク
                fieldTypes.delete(targetClass);
            }
        }
    }

    /**
     * フィールドのみの関連関係検出
     */
    findFieldOnlyAssociation(javaClass, remainingFieldTypes) {
        // まだ処理されていないフィールド型は単純な関連関係
        for (const fieldType of remainingFieldTypes) {
            this.allRelationships.push(new Relationship(
                javaClass.name,
                fieldType,
                RELATIONSHIP_TYPES.ASSOCIATION,
                { field: true, hasNewOperator: false }
            ));
        }
    }

    /**
     * 依存関係の検出（メソッド引数）
     */
    findDependencyRelationships(javaClass, classBody) {
        for (const method of javaClass.methods) {
            for (const parameter of method.parameters) {
                const paramType = extractBaseType(parameter.type);
                if (!isBasicType(paramType)) {
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
     * 関連関係の検出（フィールド参照で、所有関係でないもの）
     * 注意：このメソッドは現在findFieldOnlyAssociationで処理されているため、
     * 追加の関連関係（メソッド戻り値型など）のみを検出
     */
    findAssociationRelationships(javaClass, classBody) {
        // メソッドの戻り値型による関連関係を検出
        for (const method of javaClass.methods) {
            if (method.returnType && method.returnType !== 'void') {
                const returnType = extractBaseType(method.returnType);
                if (!isBasicType(returnType)) {
                    // 既に他の関係がある場合は除外
                    const hasOtherRelation = this.allRelationships.some(rel =>
                        rel.fromClass === javaClass.name &&
                        rel.toClass === returnType
                    );

                    if (!hasOtherRelation) {
                        this.allRelationships.push(new Relationship(
                            javaClass.name,
                            returnType,
                            RELATIONSHIP_TYPES.ASSOCIATION,
                            { returnType: method.name }
                        ));
                    }
                }
            }
        }
    }
}