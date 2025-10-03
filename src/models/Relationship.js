/**
 * UML関係性の定数とクラス定義
 */

// 関係性タイプの定数定義
export const RELATIONSHIP_TYPES = {
    INHERITANCE: 'inheritance',          // 継承：実線三角矢印
    IMPLEMENTATION: 'implementation',    // インターフェース実装：点線三角矢印
    AGGREGATION: 'aggregation',         // 集約：実線四角白矢印
    COMPOSITION: 'composition',         // コンポジション：実線四角黒矢印
    ASSOCIATION: 'association',         // 関連：線のみ
    DEPENDENCY: 'dependency'            // 依存：点線に普通の矢印
};

// 関係性情報を格納するクラス
export class Relationship {
    constructor(fromClass, toClass, type, details = {}) {
        this.fromClass = fromClass;
        this.toClass = toClass;
        this.type = type;
        this.details = details; // 追加情報（メソッド名、フィールド名など）
    }
}