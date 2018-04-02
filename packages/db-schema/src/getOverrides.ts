import {dirname} from 'path';
import * as ts from 'typescript';
import loadTsConfig from '@moped/load-ts-config';

function getSymbolAtLocation(
  node: ts.Node | null | undefined,
): ts.Symbol | undefined {
  return node ? (node as any).symbol : undefined;
}

export interface ColumnOverride {
  readonly fileName: string;
  readonly line: number;
  readonly isOpaque: boolean;
  readonly isNullable: boolean;
  readonly opaqueID: number;
}

export interface TableOverride {
  readonly [columnName: string]: ColumnOverride | undefined;
}

export interface OverridesSpec {
  readonly [tableName: string]: TableOverride | undefined;
}

interface MutableTableOverride {
  [columnName: string]: ColumnOverride | undefined;
}
interface MutableOverridesSpec {
  [tableName: string]: TableOverride | undefined;
}

export default function getOverrides(overrides?: string): OverridesSpec {
  const overrideSpec: MutableOverridesSpec = {};
  if (overrides) {
    const tsConfig = loadTsConfig(dirname(overrides), overrides);
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram([overrides], tsConfig.options as any);
    const checker = program.getTypeChecker();
    const file = program.getSourceFile(overrides);
    const fileSymbol = getSymbolAtLocation(file);
    if (fileSymbol) {
      const exports = checker.getExportsOfModule(fileSymbol);
      exports.forEach(symbol => {
        const tableName = symbol.name;
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        if (type.flags & ts.TypeFlags.Object) {
          const obj: ts.ObjectType = type as any;
          if (obj.objectFlags & ts.ObjectFlags.Interface) {
            const props: MutableTableOverride = (overrideSpec[tableName] = {});
            obj.getProperties().forEach(p => {
              const declaration = p.valueDeclaration!;
              const sourceFile = declaration.getSourceFile();
              const {
                line: baseLine,
                character,
              } = sourceFile.getLineAndCharacterOfPosition(declaration.pos);
              const line =
                baseLine +
                (character >= sourceFile.text.split('\n')[baseLine].length
                  ? 2
                  : 1);
              const property = p.valueDeclaration;

              if (
                property &&
                ts.isPropertySignature(property) &&
                property.type
              ) {
                let pType = checker.getTypeFromTypeNode(property.type);

                let isOpaque = false;
                let isNullable = false;
                let opaqueID = 0;
                if (pType.flags & ts.TypeFlags.Union) {
                  const unionType: ts.UnionType = pType as any;
                  const types = unionType.types;
                  isNullable = types.some(t => !!(t.flags & ts.TypeFlags.Null));
                  const nonNullTypes = types.filter(
                    t => !(t.flags & ts.TypeFlags.Null),
                  );
                  if (nonNullTypes.length === 1) {
                    pType = nonNullTypes[0];
                  }
                }
                if (pType.flags & ts.TypeFlags.Enum) {
                  const enumType: ts.EnumType = pType as any;
                  opaqueID = (enumType as any).id;
                  isOpaque = true;
                }
                props[p.name] = {
                  fileName: sourceFile.fileName,
                  line,
                  isOpaque,
                  isNullable,
                  opaqueID,
                };
              }
            });
          }
        }
      });
    }
  }
  return overrideSpec;
}
