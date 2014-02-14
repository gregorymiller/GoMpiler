/* --------  
 Tokens.js

 The token stuff.
 -------- */

// Regex for different tokens
var intop = /^[+]/;
var equal = /^==/;
var notEqual = /^!=/;
var trueValue = /^true/;
var falseValue = /^false/;
var digit = /^\d/;
var space = /" "/;
var char = /^[a-zA-Z]/;
var int = /^int/;
var string = /^string/;
var boolean = /^boolean/;
var leftParen = /^\(/;
var rightParen = /^\)/;
var quotes = /^("|')/;
var ifValue = /^if/;
var assignment = /^=/;
var whileValue = /^while/;
var print = /^print/;
var leftBrace = /^\{/;
var rightBrace = /^\}/;
var endOfFile = /^$/;
var newLine = /^(\n)(\r)/;
var tab = /^\t/;


// JSON so that I can relate the regex with the type without a bunch of if statements
var regExTokens = { Int:        {regex: int,        type:"T_TYPE"},
                    String:     {regex: string,     type:"T_TYPE"},
                    Boolean:    {regex: boolean,    type:"T_TYPE"},
                    WhileValue: {regex: whileValue, type:"T_WHILE"},
                    Print:      {regex: print,      type:"T_PRINT"},
                    IfValue:    {regex: ifValue,    type:"T_IF"},
                    Plus:       {regex: intop,      type:"T_INTOP"},
                    Equal:      {regex: equal,      type:"T_BOOLOP"},
                    NotEqual:   {regex: notEqual,   type:"T_BOOLOP"},
                    TrueValue:  {regex: trueValue,  type:"T_BOOLVAL"},
                    FalseValue: {regex: falseValue, type:"T_BOOLVAL"},
                    Digit:      {regex: digit,      type:"T_DIGIT"},
                    Space:      {regex: space,      type:"T_SPACE"},
                    Char:       {regex: char,       type:"T_CHAR"},
                    LeftParen:  {regex: leftParen,  type:"T_LEFTPAREN"},
                    RightParen: {regex: rightParen, type:"T_RIGHTPAREN"},
                    Quotes:     {regex: quotes,     type:"T_QUOTES"},
                    Assignment: {regex: assignment, type:"T_ASSIGNMENT"},
                    LeftBrace:  {regex: leftBrace,  type:"T_LEFTBRACE"},
                    RightBrace: {regex: rightBrace, type:"T_RIGHTBRACE"},
                    EndOfFile:  {regex: endOfFile,  type:"T_ENDOFLINE"},
                    NewLine:    {regex: newLine,    type:"T_NEWLINE"},
                    Tab:        {regex: tab,        type:"T_TAB"}};


function Token() {
    this.type = null;
    this.line = -1;
    this.value = null;
}

// Add a token with a type, value, and its line then add it to the token array
function addToken(type, value, line) {
    var tempToken = new Token();
    tempToken.type = type;
    tempToken.value = value;
    tempToken.line = line;

    _Tokens.push(tempToken);
}

function getNextToken()
{
    var thisToken = EOF;    // Let's assume that we're at the EOF.
    if (_TokenIndex < _Tokens.length)
    {
        // If we're not at EOF, then return the next token in the stream and advance the index.
        thisToken = _Tokens[_TokenIndex];
        putMessage("Current token:" + thisToken);
        _TokenIndex++;
    }
    return thisToken;
}
