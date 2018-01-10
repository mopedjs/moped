import * as builders from './builders';

export enum NodeKind {
  Bracket = 'Bracket',
  Comma = 'Comma',
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  Root = 'Root',
}
export interface CommaNode {
  kind: NodeKind.Comma;
}
export interface RootNode {
  kind: NodeKind.Root;
  nodes: AST[];
}
export interface IdentifierNode {
  kind: NodeKind.Identifier;
  text: string;
}
export interface KeywordNode {
  kind: NodeKind.Keyword;
  text: string;
}
export interface BracketNode {
  kind: NodeKind.Bracket;
  open: string;
  close: string;
  nodes: AST[];
}
export type AST =
  | CommaNode
  | RootNode
  | IdentifierNode
  | KeywordNode
  | BracketNode;

const keywords = [
  {test: /^create\s+table\b/i, value: 'CREATE TABLE'},
  {test: /^from\b/i, value: 'FROM'},
  {test: /^select\b/i, value: 'SELECT'},
  {test: /^where\b/i, value: 'WHERE'},
];
function parseKeyword(text: string): void | {node: AST; rest: string} {
  for (const {test, value} of keywords) {
    const match = test.exec(text);
    if (match) {
      return {
        node: {
          kind: NodeKind.Keyword,
          text: value,
        },
        rest: text.substr(match[0].length),
      };
    }
  }
}
function parseBracket(text: string, close: string) {
  const open = text[0];
  const {nodes, rest} = genericParse(text.substr(1), text => text[0] === close);
  const node: AST = {
    kind: NodeKind.Bracket,
    open: open,
    close,
    nodes,
  };
  return {node, rest: rest.substr(1)};
}
function parseComma(text: string) {
  const node: AST = {
    kind: NodeKind.Comma,
  };
  return {node, rest: text.substr(1)};
}
function parseNode(
  text: string,
  isWordStart: boolean,
): void | {node: AST; rest: string} {
  switch (text[0]) {
    case '(':
      return parseBracket(text, ')');
    case ',':
      return parseComma(text);
  }
  return parseKeyword(text);
}
function genericParse(text: string, isEnd: (text: string) => boolean) {
  const nodes: AST[] = [];
  while (!isEnd(text.trim()) && text.length) {
    text = text.trim();
    let id = '';
    let node = null;
    let isWordStart = true;
    while (
      !/^\s/.test(text) &&
      !isEnd(text) &&
      text.length &&
      !(node = parseNode(text, isWordStart))
    ) {
      id += text[0];
      text = text.substr(1);
      isWordStart = false;
    }
    if (id.length) {
      nodes.push({
        kind: NodeKind.Identifier,
        text: id,
      });
    }
    if (node) {
      nodes.push(node.node);
      text = node.rest;
    }
  }
  return {
    nodes,
    rest: text.trim(),
  };
}

export interface FastPath {
  getValue(): AST;
  map(print: (path: FastPath) => builders.Doc, name: string): builders.Doc[];
  call(print: (path: FastPath) => builders.Doc, name: string): builders.Doc;
}

export const languages = [
  {
    extensions: ['.sql'],
    // The language name
    name: 'sql',
    // Parsers that can parse this language.
    // This can be built-in parsers, or parsers you have contributed via this plugin.
    parsers: ['prettier-sql-parser'],
  },
];
export const parsers = {
  'prettier-sql-parser': {
    parse(text: string, parsers: any, options: any): AST {
      const {nodes} = genericParse(text, text => text.length === 0);
      return {
        kind: NodeKind.Root,
        nodes,
      };
    },
    astFormat: 'prettier-sql-ast',
  },
};

export const printers = {
  'prettier-sql-ast': {
    print(
      // Path to the AST node to print
      path: FastPath,
      options: object,
      // Recursively print a child node
      print: (path: FastPath) => builders.Doc,
    ): builders.Doc {
      const node = path.getValue();
      switch (node.kind) {
        case NodeKind.Root:
          return builders.concat([
            builders.join(' ', path.map(print, 'nodes')),
            builders.hardline,
          ]);
        case NodeKind.Identifier:
          return node.text;
        case NodeKind.Keyword:
          return builders.concat([
            builders.softline,
            builders.group(builders.concat([node.text, builders.softline])),
          ]);
        case NodeKind.Comma:
          return builders.concat([
            builders.ifBreak(',', ', '),
            builders.softline,
          ]);
        case NodeKind.Bracket:
          return builders.group(
            builders.concat([
              node.open,
              builders.indent(
                builders.concat([
                  builders.softline,
                  builders.join(' ', path.map(print, 'nodes')),
                ]),
              ),
              builders.softline,
              node.close,
            ]),
          );
      }
    },
    embed(
      // Path to the current AST node
      path: FastPath,
      // Print a node with the current printer
      print: (path: FastPath) => builders.Doc,
      // Parse and print some text using a different parser.
      // You should set `options.parser` to specify which parser to use.
      textToDoc: (text: string, options: any) => builders.Doc,
      // Current options
      options: any,
    ): builders.Doc | null {
      return this.print(path, options, print);
    },
  },
};
