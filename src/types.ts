export type Architecture = 'amd64' | 'arm64' | '386';

export interface FieldInfo {
  name: string;
  typeName: string;
  offset: number;
  size: number;
  alignment: number;
  lineNumber: number;
  paddingAfter: number;
}

export interface StructInfo {
  name: string;
  fields: FieldInfo[];
  totalSize: number;
  totalPadding: number;
  lineNumber: number;
  endLineNumber: number;
  alignment: number;
}

export interface MemoryLayout {
  structs: StructInfo[];
  architecture: Architecture;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  bytesSaved: number;
  reorderedFields: string[];
}
