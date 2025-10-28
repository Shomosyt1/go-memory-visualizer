import { StructInfo, FieldInfo, Architecture } from './types';
import { MemoryCalculator } from './memoryCalculator';

export class GoParser {
  private calculator: MemoryCalculator;

  constructor(architecture: Architecture = 'amd64') {
    this.calculator = new MemoryCalculator(architecture);
  }

  setArchitecture(arch: Architecture): void {
    this.calculator.setArchitecture(arch);
  }

  parseStructs(content: string): StructInfo[] {
    const structs: StructInfo[] = [];
    const lines = content.split('\n');
    
    // match struct declarations like: type MyStruct struct {
    const structStartRegex = /^\s*type\s+(\w+)\s+struct\s*\{/;
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(structStartRegex);
      
      if (match) {
        const structName = match[1];
        const startLine = i;
        const fields: Array<{ name: string; typeName: string; lineNumber: number }> = [];
        
        i++;
        // keep going until we find the closing brace
        while (i < lines.length) {
          const fieldLine = lines[i].trim();
          
          // Check for closing brace
          if (fieldLine.startsWith('}')) {
            break;
          }
          
          // Skip empty lines and comments
          if (!fieldLine || fieldLine.startsWith('//')) {
            i++;
            continue;
          }
          
          // Parse field: name type or name, name2 type
          const fieldMatch = fieldLine.match(/^(\w+(?:\s*,\s*\w+)*)\s+(.+?)(?:\s+`.*`)?(?:\s*\/\/.*)?$/);
          if (fieldMatch) {
            const names = fieldMatch[1].split(',').map(n => n.trim());
            const typeName = fieldMatch[2].trim();
            
            for (const name of names) {
              fields.push({ name, typeName, lineNumber: i });
            }
          }
          
          i++;
        }
        
        // Calculate memory layout for this struct
        const structInfo = this.calculateStructLayout(structName, fields, startLine, i);
        structs.push(structInfo);
      }
      
      i++;
    }
    
    return structs;
  }

  private calculateStructLayout(
    name: string,
    fields: Array<{ name: string; typeName: string; lineNumber: number }>,
    startLine: number,
    endLine: number
  ): StructInfo {
    if (fields.length === 0) {
      return {
        name,
        fields: [],
        totalSize: 0,
        totalPadding: 0,
        lineNumber: startLine,
        endLineNumber: endLine,
        alignment: 1
      };
    }

    const layout = this.calculator.calculateStructSize(
      fields.map(f => ({ typeName: f.typeName }))
    );

    const fieldInfos: FieldInfo[] = fields.map((field, idx) => {
      const typeInfo = this.calculator.getTypeInfo(field.typeName);
      const offset = layout.fieldOffsets[idx];
      const paddingAfter = idx < fields.length - 1 
        ? layout.fieldOffsets[idx + 1] - (offset + typeInfo.size)
        : layout.paddings[fields.length]; // Final padding

      return {
        name: field.name,
        typeName: field.typeName,
        offset,
        size: typeInfo.size,
        alignment: typeInfo.alignment,
        lineNumber: field.lineNumber,
        paddingAfter
      };
    });

    const totalPadding = layout.paddings.reduce((sum, p) => sum + p, 0);

    return {
      name,
      fields: fieldInfos,
      totalSize: layout.size,
      totalPadding,
      lineNumber: startLine,
      endLineNumber: endLine,
      alignment: layout.alignment
    };
  }
}
