import * as vscode from 'vscode';
import { GoParser } from './goParser';
import { StructOptimizer } from './optimizer';
import { Architecture } from './types';

// default to amd64 since most devs use that
let currentArch: Architecture = 'amd64';

const paddingDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 165, 0, 0.3)',
  border: '1px solid rgba(255, 165, 0, 0.5)',
});

const annotationDecorationType = vscode.window.createTextEditorDecorationType({
  before: {
    color: '#888',
    fontStyle: 'italic',
  },
  isWholeLine: false,
});

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('goMemoryVisualizer');
  currentArch = config.get('defaultArchitecture', 'amd64') as Architecture;

  const parser = new GoParser(currentArch);
  const optimizer = new StructOptimizer(parser['calculator']);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('goMemoryVisualizer.optimizeStruct', () => {
      optimizeStructCommand(parser, optimizer);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('goMemoryVisualizer.showMemoryLayout', () => {
      showMemoryLayoutCommand(parser);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('goMemoryVisualizer.toggleArchitecture', () => {
      toggleArchitectureCommand(parser);
    })
  );

  // Register providers
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('go', new MemoryLayoutHoverProvider(parser))
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider('go', new OptimizationCodeLensProvider(parser, optimizer))
  );

  // Update decorations on document change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && editor.document.languageId === 'go') {
        updateDecorations(editor, parser);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document && editor.document.languageId === 'go') {
        updateDecorations(editor, parser);
      }
    })
  );

  // Initial decoration
  if (vscode.window.activeTextEditor?.document.languageId === 'go') {
    updateDecorations(vscode.window.activeTextEditor, parser);
  }
}

export function deactivate() {
  paddingDecorationType.dispose();
  annotationDecorationType.dispose();
}

function updateDecorations(editor: vscode.TextEditor, parser: GoParser) {
  const config = vscode.workspace.getConfiguration('goMemoryVisualizer');
  if (!config.get('showInlineAnnotations', true)) {
    return;
  }

  const text = editor.document.getText();
  const structs = parser.parseStructs(text);
  
  const paddingRanges: vscode.DecorationOptions[] = [];
  const annotations: vscode.DecorationOptions[] = [];
  const paddingThreshold = config.get('paddingWarningThreshold', 8);

  for (const struct of structs) {
    for (const field of struct.fields) {
      const line = editor.document.lineAt(field.lineNumber);
      
      // Build the inline annotation text
      const annotation = `[${field.offset}-${field.offset + field.size - 1}] ${field.size}B`;
      const paddingInfo = field.paddingAfter > 0 ? ` +${field.paddingAfter}B padding [!]` : '';
      
      annotations.push({
        range: new vscode.Range(field.lineNumber, 0, field.lineNumber, 0),
        renderOptions: {
          before: {
            contentText: `  ${annotation}${paddingInfo}  `,
            color: field.paddingAfter >= paddingThreshold ? '#ff6b6b' : '#888',
          }
        }
      });

      // Highlight padding
      if (config.get('highlightPadding', true) && field.paddingAfter >= paddingThreshold) {
        paddingRanges.push({
          range: line.range,
          hoverMessage: `This field has ${field.paddingAfter} bytes of padding after it. Consider reordering struct fields.`
        });
      }
    }
  }

  editor.setDecorations(annotationDecorationType, annotations);
  editor.setDecorations(paddingDecorationType, paddingRanges);
}

async function optimizeStructCommand(parser: GoParser, optimizer: StructOptimizer) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'go') {
    vscode.window.showErrorMessage('Please open a Go file');
    return;
  }

  const position = editor.selection.active;
  const text = editor.document.getText();
  const structs = parser.parseStructs(text);

  // Find struct containing cursor
  const struct = structs.find(s => 
    position.line >= s.lineNumber && position.line <= s.endLineNumber
  );

  if (!struct) {
    vscode.window.showErrorMessage('Cursor not inside a struct definition');
    return;
  }

  const result = optimizer.optimizeStruct(struct);
  
  if (result.bytesSaved === 0) {
    vscode.window.showInformationMessage(`Struct ${struct.name} is already optimally ordered`);
    return;
  }

  const optimized = optimizer.generateOptimizedCode(text, struct, result);
  
  await editor.edit(editBuilder => {
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(text.length)
    );
    editBuilder.replace(fullRange, optimized);
  });

  vscode.window.showInformationMessage(
    `Optimized ${struct.name}: saved ${result.bytesSaved} bytes (${result.originalSize}B → ${result.optimizedSize}B)`
  );
}

function showMemoryLayoutCommand(parser: GoParser) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'go') {
    vscode.window.showErrorMessage('Please open a Go file');
    return;
  }

  const text = editor.document.getText();
  const structs = parser.parseStructs(text);

  if (structs.length === 0) {
    vscode.window.showInformationMessage('No structs found in current file');
    return;
  }

  let output = `# Memory Layout (${currentArch})\n\n`;
  
  for (const struct of structs) {
    output += `## ${struct.name}\n`;
    output += `Total Size: ${struct.totalSize} bytes\n`;
    output += `Alignment: ${struct.alignment} bytes\n`;
    output += `Total Padding: ${struct.totalPadding} bytes\n\n`;
    
    output += '| Field | Type | Offset | Size | Padding |\n';
    output += '|-------|------|--------|------|----------|\n';
    
    for (const field of struct.fields) {
      output += `| ${field.name} | ${field.typeName} | ${field.offset} | ${field.size} | ${field.paddingAfter} |\n`;
    }
    
    output += '\n';
  }

  const panel = vscode.window.createWebviewPanel(
    'memoryLayout',
    'Go Memory Layout',
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          table { border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; }
          th { background-color: var(--vscode-editor-background); }
          h1, h2 { color: var(--vscode-foreground); }
        </style>
      </head>
      <body>
        <pre>${output}</pre>
      </body>
    </html>
  `;
}

async function toggleArchitectureCommand(parser: GoParser) {
  const archs: Architecture[] = ['amd64', 'arm64', '386'];
  const selected = await vscode.window.showQuickPick(archs, {
    placeHolder: `Current: ${currentArch}`
  });

  if (selected) {
    currentArch = selected as Architecture;
    parser.setArchitecture(selected as Architecture);
    
    if (vscode.window.activeTextEditor?.document.languageId === 'go') {
      updateDecorations(vscode.window.activeTextEditor, parser);
    }
    
    vscode.window.showInformationMessage(`Architecture set to ${selected}`);
  }
}

class MemoryLayoutHoverProvider implements vscode.HoverProvider {
  constructor(private parser: GoParser) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const text = document.getText();
    const structs = this.parser.parseStructs(text);

    for (const struct of structs) {
      const field = struct.fields.find(f => f.lineNumber === position.line);
      
      if (field) {
        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**${struct.name}.${field.name}**\n\n`);
        markdown.appendMarkdown(`Type: \`${field.typeName}\`\n\n`);
        markdown.appendMarkdown(`Offset: ${field.offset} bytes\n\n`);
        markdown.appendMarkdown(`Size: ${field.size} bytes\n\n`);
        markdown.appendMarkdown(`Alignment: ${field.alignment} bytes\n\n`);
        
        if (field.paddingAfter > 0) {
          markdown.appendMarkdown(`Warning: Padding after: ${field.paddingAfter} bytes\n\n`);
          markdown.appendMarkdown(`*Consider reordering fields to reduce padding*`);
        }
        
        return new vscode.Hover(markdown);
      }
    }

    return null;
  }
}

class OptimizationCodeLensProvider implements vscode.CodeLensProvider {
  constructor(
    private parser: GoParser,
    private optimizer: StructOptimizer
  ) {}

  provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const text = document.getText();
    const structs = this.parser.parseStructs(text);
    const lenses: vscode.CodeLens[] = [];

    for (const struct of structs) {
      const result = this.optimizer.optimizeStruct(struct);
      
      if (result.bytesSaved > 0) {
        const range = new vscode.Range(struct.lineNumber, 0, struct.lineNumber, 0);
        
        const lens = new vscode.CodeLens(range, {
          title: `Optimize Layout (save ${result.bytesSaved}B)`,
          command: 'goMemoryVisualizer.optimizeStruct',
          arguments: []
        });
        
        lenses.push(lens);
      }
    }

    return lenses;
  }
}


