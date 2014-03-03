/* --------
 Parse.js

 Parses the tokens.
 -------- */


function parseProgram() {
    putMessage("Parsing has started.");

    // If parse block returns true try to parse the EOF otherwise stop parsing
    if (parseBlock())
        // If the EOF is parsed correctly finish parsing
        if (parseEndOfFile())
            putMessage("Parsing complete.");
        else
            parseStop();
    else
        parseStop();
}

function parseEndOfFile() {
    // If the next token to be parsed is the end of file return true otherwise throw an error
    if (parseLookAheadOne().type === "T_ENDOFFILE")
    {
        _CurrentToken = parseGetNextToken();
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type + " expecting $");
        _ErrorCount++;
        return false;
    }
}

function parseBlock() {
    // Check for { else throw an error
    if (parseLookAheadOne().type === "T_LEFTBRACE")
    {
        _CurrentToken = parseGetNextToken();
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type + " expecting {");
        _ErrorCount++;
        return false;
    }

    // Parse statementlist if there are problems return false
    if (parseStatementList())
    {
        // If all statements are parsed try to parse } else throw an error
        if (parseLookAheadOne().type === "T_RIGHTBRACE")
        {
            _CurrentToken = parseGetNextToken();
            return true;
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type + " expecting }");
            _ErrorCount++;
            return false;
        }
    }
    else
    {
        return false;
    }
}


function parseStatementList() {
    // If you can look ahead and see } then return true because of the epsilon transition
    if (parseEmptyString().type === "T_RIGHTBRACE")
        return true;
    // Parse a statement then statementlist return true or false depending on if parse correctly
    if (parseStatement())
        if (parseStatementList())
            return true;
        else
            return false;
    else
        return false;
}

// Look ahead one to represent an epsilon transition
function parseEmptyString() {
    return parseLookAheadOne();
}

function parseStatement() {
    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // See if it is any of the acceptable token then call depending on that
    // If there are problems in the recursion return false and if it is not a correct token
    // throw an error
    if (tempToken === "T_PRINT")
    {
        if (!parsePrintStatement())
             return false;
    }
    else if (tempToken === "T_ID")
    {
        if (!parseAssignmentStatement())
            return false;
    }
    else if (tempToken === "T_TYPE")
    {
        if (!parseVarDecl())
            return false;
    }
    else if (tempToken === "T_WHILE")
    {
        if (!parseWhileStatement())
            return false;
    }
    else if (tempToken === "T_IF")
    {
        if (!parseIfStatement())
            return false;
    }
    else if (tempToken === "T_LEFTBRACE")
    {
        if (!parseBlock())
            return false;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + tempToken + " expecting print, id, type, while, " +
            "if, or {.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parsePrintStatement() {
    _CurrentToken = parseGetNextToken();

    // If it is a print statement check for a ( then parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_LEFTPAREN")
    {
        _CurrentToken = parseGetNextToken();
        if (!parseExpr())
            return false;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type + " expecting (.");
        _ErrorCount++;
        return false;
    }

    // If expr was parsed correctly look for a ) otherwise throw an error
    if (parseLookAheadOne().type === "T_RIGHTPAREN")
    {
        _CurrentToken = parseGetNextToken();
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type + " expecting ).");
        _ErrorCount++;
        return false;
    }
}

function parseAssignmentStatement() {
    _CurrentToken = parseGetNextToken();

    // If the next token is = parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_ASSIGNMENT")
    {
        _CurrentToken = parseGetNextToken();
        if (!parseExpr())
            return false;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting =.");
        _ErrorCount++;
        return false;
    }

    return true;
}
function parseVarDecl() {
    // Maybe do symbol table stuff here
    _CurrentToken = parseGetNextToken();

    // Parse id error handling will be handled in the called function
    if (!parseId())
        return false;
    return true;
}
function parseWhileStatement() {
    _CurrentToken = parseGetNextToken();

    // Parse a boolean expression then a block of the while
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    if (!parseBlock())
        return false;
    return true;
}
function parseIfStatement() {
    _CurrentToken = parseGetNextToken();

    // Parse a boolean expression then a block of the if
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    if (!parseBlock())
        return false;
    return true;
}

function parseExpr() {
    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // Check for a correct token otherwise throw an error
    // If there is a problem in method calls return false
    if (tempToken === "T_DIGIT")
    {
        if (!parseIntExpr())
            return false;
    }
    else if (tempToken === "T_QUOTES")
    {
        if (!parseStringExpr())
            return false;
    }
    else if (tempToken === "T_LEFTPAREN" || tempToken === "T_BOOLVAL")
    {
        if (!parseBooleanExpr())
            return false;
    }
    else if (tempToken === "T_ID")
    {
        if (!parseId())
            return false;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + tempToken + " expecting digit, quotes, (, id.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parseIntExpr() {
    _CurrentToken = parseGetNextToken();
    var tempNextToken = parseLookAheadOne().type;

    // If the current token is a digit and it is followed by a plus parse expr
    // Throw an error if digit is not found
    if (_CurrentToken.type === "T_DIGIT" && tempNextToken === "T_INTOP")
    {
        _CurrentToken = parseGetNextToken();
        if (!parseExpr())
            return false
    }
    // If it is just a digit return true
    else if (_CurrentToken.type === "T_DIGIT")
    {
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting digit or digit +.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parseStringExpr() {
    _CurrentToken = parseGetNextToken();
    // Parse char list if there is a problem return false
    if (!parseCharList())
        return false;

    _CurrentToken = parseGetNextToken();

    // If the next token is not a end quote throw an error
    if (_CurrentToken.type === "T_ENDQUOTES")
    {
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting end quote.");
        _ErrorCount++;
        return false;
    }
}

function parseCharList() {
    _CurrentToken = parseGetNextToken();

    // See if the next token is the end quote for an epsilon transition
    if (parseEmptyString().type === "T_ENDQUOTES")
    {
        return true;
    }
    // If it is a character or a a space continue to parse otherwise throw an error
    else if (_CurrentToken.type === "T_CHAR" || _CurrentToken.type === "T_SPACE")
    {
        if (!parseCharList())
            return false;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting space or char.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parseBooleanExpr() {
    _CurrentToken = parseGetNextToken();

    // If it is true or false return true
    if (_CurrentToken.type === "T_BOOLVAL")
    {
        return true;
    }
    // If it is not a boolean value it is a whole expression
    else
    {
        // Get the (
        _CurrentToken = parseGetNextToken();
        // Then parse expr
        if (!parseExpr())
            return false;

        _CurrentToken = parseGetNextToken();

        // After parsing expr check for a boolean operation otherwise throw an error
        if (_CurrentToken.type === "T_BOOLOP")
        {
            // Then parse expr
            if (!parseExpr())
                return false;
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting == or !=.");
            _ErrorCount++;
            return false;
        }

        _CurrentToken = parseGetNextToken();

        // Check if the next token is the ) otherwise throw an error
        if (_CurrentToken.type === "T_RIGHTPAREN")
        {
            return true;
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting ).");
            _ErrorCount++;
            return false;
        }
    }
}

function parseId() {
    _CurrentToken = parseGetNextToken();

    // If it is an id return true otherwise throw an error
    if (_CurrentToken.type === "T_ID")
    {
        // Do symbol table stuff
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType() + " expecting id.");
        _ErrorCount++;
        return false;
    }
}

// Stop parsing
function parseStop() {
    putMessage("Please address errors and try again.");
}
