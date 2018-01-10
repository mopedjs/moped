const {builders} = require('prettier').doc;

// {concat, join, line, ifBreak, group}

export interface Document {
  type: string;
}
export type Doc = string | Document;

export const concat: (parts: Doc[]) => Doc = builders.concat;
export const join: (separator: Doc, parts: Doc[]) => Doc = builders.join;
export const line: Doc = builders.line;
export const softline: Doc = builders.line;
export const hardline: Doc = builders.line;
export const literalline: Doc = builders.line;
export const group: (
  contents: Doc,
  options?: {shouldBreak?: boolean; expandedStates?: boolean},
) => Doc =
  builders.group;
export const conditionalGroup: (
  states: Doc[],
  options?: {shouldBreak?: boolean},
) => Doc =
  builders.group;
export const fill: (parts: Doc[]) => Doc = builders.fill;
export const lineSuffix: (parts: Doc) => Doc = builders.lineSuffix;
export const lineSuffixBoundary: Doc = builders.lineSuffixBoundary;
export const cursor: Doc = builders.cursor;
export const breakParent: Doc = builders.breakParent;

export const ifBreak: (breakContents: Doc, flatContents: Doc) => Doc =
  builders.ifBreak;
export const indent: (contents: Doc) => Doc = builders.indent;
export const align: (n: number, contents: Doc) => Doc = builders.align;
export const addAlignmentToDoc: (
  doc: Doc,
  size: number,
  tabWidth: number,
) => Doc =
  builders.addAlignmentToDoc;
