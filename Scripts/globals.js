/* --------
 Globals.js

 Global variables.
 -------- */
var _Tokens = [];
var _TokenIndex = 0;
var _CurrentToken = null;
var _ErrorCount = 0;
var EOF = "$";
var _SymbolTable = null;
var _CST = null;
var _AST = null;
var _ProgramCode = [];
var _ReferenceTable = {};
var _JumpTable = {};
var _HeapLocation = 255;
var _CodeLocation = 0;