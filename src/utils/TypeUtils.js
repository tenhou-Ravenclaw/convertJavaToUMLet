/**
 * 型関連のユーティリティ関数
 */

/**
 * 基本型かどうかの判定
 */
export function isBasicType(typeName) {
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
export function extractBaseType(type) {
    // ジェネリクス記号を除去
    let baseType = type.replace(/<.*>/g, '');
    // 配列記号を除去
    baseType = baseType.replace(/\[\]/g, '');
    return baseType.trim();
}