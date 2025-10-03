/**
 * UMLet形式のテキスト生成器
 */

import { RELATIONSHIP_TYPES } from '../models/index.js';

export class UMLletGenerator {
    /**
     * JavaクラスのリストからUMLet形式のテキストを生成
     */
    generateUMLet(classes, relationships, options = {}) {
        const { spacing = 50, baseX = 100, baseY = 100 } = options;
        let umlText = '';

        // クラス図の生成
        classes.forEach((javaClass, index) => {
            const classText = this.generateClassDiagram(javaClass, baseX + (index % 3) * 300, baseY + Math.floor(index / 3) * 200);
            umlText += classText + '\n';
        });

        // 関係性の生成
        relationships.forEach(relationship => {
            const relationshipText = this.generateRelationshipDiagram(relationship);
            umlText += relationshipText + '\n';
        });

        return umlText.trim();
    }

    /**
     * 単一クラスのUMLet図を生成
     */
    generateClassDiagram(javaClass, x = 100, y = 100) {
        let umlText = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
        umlText += '<diagram program="umlet" version="14.3.0">\n';
        umlText += `  <zoom_level>10</zoom_level>\n`;
        umlText += `  <element>\n`;
        umlText += `    <id>UMLClass</id>\n`;
        umlText += `    <coordinates>\n`;
        umlText += `      <x>${x}</x>\n`;
        umlText += `      <y>${y}</y>\n`;
        umlText += `      <w>200</w>\n`;
        umlText += `      <h>${this.calculateClassHeight(javaClass)}</h>\n`;
        umlText += `    </coordinates>\n`;
        umlText += `    <panel_attributes>${this.generateClassContent(javaClass)}</panel_attributes>\n`;
        umlText += `    <additional_attributes/>\n`;
        umlText += `  </element>\n`;
        umlText += '</diagram>';

        return umlText;
    }

    /**
     * クラスの内容（名前、フィールド、メソッド）を生成
     */
    generateClassContent(javaClass) {
        let content = '';

        // クラス名（ステレオタイプ付き）
        if (javaClass.isInterface) {
            content += `<<interface>>\n${javaClass.name}`;
        } else if (javaClass.isAbstract) {
            content += `/${javaClass.name}/`;
        } else if (javaClass.isEnum) {
            content += `<<enum>>\n${javaClass.name}`;
        } else {
            content += javaClass.name;
        }

        // フィールド
        if (javaClass.fields.length > 0) {
            content += '\n--\n';
            javaClass.fields.forEach(field => {
                content += this.formatField(field) + '\n';
            });
        }

        // メソッド
        if (javaClass.methods.length > 0 || javaClass.constructors.length > 0) {
            content += '--\n';

            // コンストラクタを先に表示
            if (javaClass.constructors) {
                javaClass.constructors.forEach(constructor => {
                    content += this.formatMethod(constructor) + '\n';
                });
            }

            // 通常のメソッドを表示
            javaClass.methods.forEach(method => {
                content += this.formatMethod(method) + '\n';
            });
        }

        return content.trim();
    }

    /**
     * フィールドの可視性記号を取得
     */
    getVisibilitySymbol(visibility) {
        switch (visibility) {
            case 'public': return '+';
            case 'private': return '-';
            case 'protected': return '#';
            case 'package': return '~';
            default: return '~';
        }
    }

    /**
     * フィールドのフォーマット
     */
    formatField(field) {
        const symbol = this.getVisibilitySymbol(field.visibility);
        let formattedField = `${symbol} ${field.name}: ${field.type}`;

        // staticフィールドはアンダースコアで囲む、finalは無視
        if (field.isStatic) {
            formattedField = `_${formattedField}_`;
        }

        return formattedField;
    }

    /**
     * メソッドのフォーマット
     */
    formatMethod(method) {
        const symbol = this.getVisibilitySymbol(method.visibility);
        const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');

        // コンストラクタの場合は戻り値型を表示しない
        let formattedMethod = `${symbol} ${method.name}(${params})`;

        // コンストラクタでない場合は戻り値型を表示（voidも含む）
        if (method.returnType && !method.isConstructor) {
            formattedMethod += `: ${method.returnType}`;
        }

        // staticメソッドはアンダースコアで囲む、finalは無視
        if (method.isStatic) {
            formattedMethod = `_${formattedMethod}_`;
        }

        // 抽象メソッドの場合は行全体を斜線で囲む
        if (method.isAbstract) {
            formattedMethod = `/${formattedMethod}/`;
        }

        return formattedMethod;
    }

    /**
     * クラス図の高さを計算
     */
    calculateClassHeight(javaClass) {
        let lines = 1; // クラス名
        if (javaClass.fields.length > 0) {
            lines += 1 + javaClass.fields.length; // セパレータ + フィールド
        }
        if (javaClass.methods.length > 0) {
            lines += 1 + javaClass.methods.length; // セパレータ + メソッド
        }
        return Math.max(80, lines * 15 + 20); // 最小高さ80px
    }

    /**
     * 関係性図を生成
     */
    generateRelationshipDiagram(relationship) {
        let umlText = '  <element>\n';
        umlText += '    <id>Relation</id>\n';
        umlText += '    <coordinates>\n';
        umlText += '      <x>0</x>\n';
        umlText += '      <y>0</y>\n';
        umlText += '      <w>100</w>\n';
        umlText += '      <h>50</h>\n';
        umlText += '    </coordinates>\n';
        umlText += `    <panel_attributes>lt=${this.getRelationshipArrow(relationship.type)}</panel_attributes>\n`;
        umlText += `    <additional_attributes>10.0;10.0;90.0;40.0</additional_attributes>\n`;
        umlText += '  </element>';

        return umlText;
    }

    /**
     * 関係性タイプに応じた矢印記号を取得
     */
    getRelationshipArrow(relationshipType) {
        switch (relationshipType) {
            case RELATIONSHIP_TYPES.INHERITANCE:
                return '-|&gt;'; // 継承（実線、白抜き三角）
            case RELATIONSHIP_TYPES.IMPLEMENTATION:
                return '..|&gt;'; // 実装（点線、白抜き三角）
            case RELATIONSHIP_TYPES.COMPOSITION:
                return '&lt;&lt;-'; // コンポジション（実線、黒塗りダイアモンド）
            case RELATIONSHIP_TYPES.AGGREGATION:
                return '&lt;&lt;&lt;-'; // 集約（実線、白抜きダイアモンド）
            case RELATIONSHIP_TYPES.ASSOCIATION:
                return '-'; // 関連（実線）
            case RELATIONSHIP_TYPES.DEPENDENCY:
                return '..&gt;'; // 依存（点線、矢印）
            default:
                return '-';
        }
    }

    /**
     * 簡易テキスト形式での関係性表示（デバッグ用）
     */
    generateSimpleRelationshipText(relationships) {
        let text = '=== 検出された関係性 ===\n\n';

        const groupedRelationships = this.groupRelationshipsByType(relationships);

        Object.entries(groupedRelationships).forEach(([type, relations]) => {
            if (relations.length > 0) {
                text += `【${this.getRelationshipTypeName(type)}】\n`;
                relations.forEach(rel => {
                    const arrow = this.getSimpleArrow(rel.type);
                    text += `  ${rel.fromClass} ${arrow} ${rel.toClass}\n`;
                });
                text += '\n';
            }
        });

        return text;
    }

    /**
     * 関係性をタイプ別にグループ化
     */
    groupRelationshipsByType(relationships) {
        const grouped = {};
        Object.values(RELATIONSHIP_TYPES).forEach(type => {
            grouped[type] = [];
        });

        relationships.forEach(rel => {
            if (grouped[rel.type]) {
                grouped[rel.type].push(rel);
            }
        });

        return grouped;
    }

    /**
     * 関係性タイプの日本語名を取得
     */
    getRelationshipTypeName(type) {
        switch (type) {
            case RELATIONSHIP_TYPES.INHERITANCE: return '継承';
            case RELATIONSHIP_TYPES.IMPLEMENTATION: return '実装';
            case RELATIONSHIP_TYPES.COMPOSITION: return 'コンポジション';
            case RELATIONSHIP_TYPES.AGGREGATION: return '集約';
            case RELATIONSHIP_TYPES.ASSOCIATION: return '関連';
            case RELATIONSHIP_TYPES.DEPENDENCY: return '依存';
            default: return type;
        }
    }

    /**
     * 簡易表示用の矢印記号を取得
     */
    getSimpleArrow(relationshipType) {
        switch (relationshipType) {
            case RELATIONSHIP_TYPES.INHERITANCE: return '──|▷';
            case RELATIONSHIP_TYPES.IMPLEMENTATION: return '┅┅|▷';
            case RELATIONSHIP_TYPES.COMPOSITION: return '◆───';
            case RELATIONSHIP_TYPES.AGGREGATION: return '◇───';
            case RELATIONSHIP_TYPES.ASSOCIATION: return '─────';
            case RELATIONSHIP_TYPES.DEPENDENCY: return '┅┅▷';
            default: return '─────';
        }
    }
}