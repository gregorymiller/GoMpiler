/* --------  
 Tokens.js

 The token stuff.
 -------- */

function Token() {
    this.type = null;
    this.line = -1;
    this.value = null;
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
