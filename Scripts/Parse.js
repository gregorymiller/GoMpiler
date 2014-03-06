/* --------
 Parse.js

 Parses the tokens.
 -------- */


function parseProgram() {
    putMessage("Parsing has started.");

    _CST.addNode("Program", "branch");

    // If parse block returns true try to parse the EOF otherwise stop parsing
    if (parseBlock())
    {
        _CST.atLeaf();
        // If the EOF is parsed correctly finish parsing
        if (!parseEndOfFile())
            parseStop();
    }
    else
        parseStop();

    if (_ErrorCount < 1)
    {
        putMessage("Parsing complete.");
        verbosePutMessage("The concrete syntax tree is:");
        verbosePutMessage(_CST.toString());
        verbosePutMessage("The symbol table is:");
        verbosePutMessage(_SymbolTable.toString());
    }
}

function parseEndOfFile() {
    // If the next token to be parsed is the end of file return true otherwise throw an error
    if (parseLookAheadOne().type === "T_ENDOFFILE")
    {
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, "leaf");
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type
            + " on line: " + parseLookAheadOne().line + " expecting $");
        _ErrorCount++;
        return false;
    }
}

function parseBlock() {
    _CST.addNode("Block", "branch");
    // Check for { else throw an error
    if (parseLookAheadOne().type === "T_LEFTBRACE")
    {
        _CurrentToken = parseGetNextToken();
        _SymbolTable.newScope();
        _CST.addNode(_CurrentToken.value, "leaf");
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type
            + " on line: " + parseLookAheadOne().line + " expecting {");
        _ErrorCount++;
        return false;
    }

    // Parse statementlist if there are problems return false
    if (parseStatementList())
    {
        _CST.atLeaf();
        // If all statements are parsed try to parse } else throw an error
        if (parseLookAheadOne().type === "T_RIGHTBRACE")
        {
            _CurrentToken = parseGetNextToken();
            _SymbolTable.endScope();
            _CST.addNode(_CurrentToken.value, "leaf");
            return true;
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type
                + " on line: " + parseLookAheadOne().line + " expecting }");
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
    _CST.addNode("StatementList", "branch");
    // If you can look ahead and see } then return true because of the epsilon transition
    if (parseEmptyString().type === "T_RIGHTBRACE")
    {
        return true;
    }

    // Parse a statement then statementlist return true or false depending on if parse correctly
    if (parseStatement())
    {
        _CST.atLeaf();
        if (parseStatementList())
        {
            _CST.atLeaf();
            return true;
        }
        else
            return false;
    }
    else
        return false;
}

// Look ahead one to represent an epsilon transition
function parseEmptyString() {
    return parseLookAheadOne();
}

function parseStatement() {
    _CST.addNode("Statement", "branch");
    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // See if it is any of the acceptable token then call depending on that
    // If there are problems in the recursion return false and if it is not a correct token
    // throw an error
    if (tempToken === "T_PRINT") {
        if (!parsePrintStatement())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_ID") {
        if (!parseAssignmentStatement())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_TYPE") {
        if (!parseVarDecl())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_WHILE") {
        if (!parseWhileStatement())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_IF") {
        if (!parseIfStatement())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_LEFTBRACE")
    {
        if (!parseBlock())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + tempToken
            + " on line: " + parseLookAheadOne().line + " expecting print, id, type, while, if, or {.");
        _ErrorCount++;
        return false;
    }
}

function parsePrintStatement() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("PrintStatement", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // If it is a print statement check for a ( then parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_LEFTPAREN")
    {
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, "leaf");

        if (parseLookAheadOne().type === "T_ID")
        {
            if (_SymbolTable.currentScope.isUsed(parseLookAheadOne()) === false)
            {
                putMessage("Error: Id used is never declared.");
                _ErrorCount++;
                return false;
            }
        }

        if (!parseExpr())
            return false;
        else
        {
            _CST.atLeaf();
        }
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type
            + " on line: " + parseLookAheadOne().line + " expecting (.");
        _ErrorCount++;
        return false;
    }

    // If expr was parsed correctly look for a ) otherwise throw an error
    if (parseLookAheadOne().type === "T_RIGHTPAREN")
    {
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, "leaf");
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + parseLookAheadOne().type
            + " on line: " + parseLookAheadOne().line + " expecting ).");
        _ErrorCount++;
        return false;
    }
}

function parseAssignmentStatement() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("AssignmentStatement", "branch");
    _CST.addNode("Id", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");
    _CST.atLeaf();

    if (_SymbolTable.currentScope.setUsed(_CurrentToken) === false)
    {
        putMessage("Error: Id used is never declared.");
        _ErrorCount++;
        return false;
    }

    // If the next token is = parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_ASSIGNMENT")
    {
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, "leaf");
        if (!parseExpr())
            return false;
        else
            _CST.atLeaf();
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting =.");
        _ErrorCount++;
        return false;
    }

    return true;
}
function parseVarDecl() {
    // Maybe do symbol table stuff here
    _CurrentToken = parseGetNextToken();
    _PreviousToken = _CurrentToken;
    _CST.addNode("VarDecl", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // Parse id error handling will be handled in the called function
    if (!parseId())
        return false;
    else
    {
        if (!_SymbolTable.newSymbol(_CurrentToken, _PreviousToken))
        {
            putMessage("Error: Identifier already in use.");
            return false;
        }

        _CST.atLeaf();
        return true;
    }
}
function parseWhileStatement() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("WhileStatement", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // Parse a boolean expression then a block of the while
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    else
    {
        _CST.atLeaf();
    }
    if (!parseBlock())
        return false;
    else
    {
        _CST.atLeaf();
    }
    return true;
}
function parseIfStatement() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("IfStatement", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // Parse a boolean expression then a block of the if
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    else
    {
        _CST.atLeaf();
    }
    if (!parseBlock())
        return false;
    else
    {
        _CST.atLeaf();
    }
    return true;
}

function parseExpr() {
    _CST.addNode("Expr", "branch");
    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // Check for a correct token otherwise throw an error
    // If there is a problem in method calls return false
    if (tempToken === "T_DIGIT")
    {
        if (!parseIntExpr())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_QUOTES")
    {
        if (!parseStringExpr())
            return false;
        else
        {
            _CST.atLeaf();
           return true;
        }
    }
    else if (tempToken === "T_LEFTPAREN" || tempToken === "T_BOOLVAL")
    {
        if (!parseBooleanExpr())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_ID")
    {
        if (!parseId())
            return false;
        else
        {
            _CST.atLeaf();
            return true;
        }
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + tempToken + " on line: "
            + parseLookAheadOne().line + " expecting digit, quotes, (, id, or boolval.");
        _ErrorCount++;
        return false;
    }
}

function parseIntExpr() {
    _CurrentToken = parseGetNextToken();
    var tempNextToken = parseLookAheadOne().type;
    _CST.addNode("IntExpr", "branch");


    // If the current token is a digit and it is followed by a plus parse expr
    // Throw an error if digit is not found
    if (_CurrentToken.type === "T_DIGIT" && tempNextToken === "T_INTOP")
    {
        _CST.addNode(_CurrentToken.value, "leaf");

        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, "leaf");

        if (parseLookAheadOne().type === "T_ID")
        {
            if (_SymbolTable.currentScope.isUsed(parseLookAheadOne()) === false)
            {
                putMessage("Error: Id used is never declared.");
                _ErrorCount++;
                return false;
            }
        }

        if (!parseExpr())
            return false;
        else
        {
            _CST.atLeaf();
        }
    }
    // If it is just a digit return true
    else if (_CurrentToken.type === "T_DIGIT")
    {
        _CST.addNode(_CurrentToken.value, "leaf");

    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting digit or digit +.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parseStringExpr() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("StringExpr", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // Parse char list if there is a problem return false
    if (!parseCharList())
        return false;
    else
    {
        _CST.atLeaf();
    }

    _CurrentToken = parseGetNextToken();

    // If the next token is not a end quote throw an error
    if (_CurrentToken.type === "T_ENDQUOTES")
    {
        _CST.addNode(_CurrentToken.value, "leaf");

        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting end quote.");
        _ErrorCount++;
        return false;
    }
}

function parseCharList() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("CharList", "branch");

    // See if the next token is the end quote for an epsilon transition
    if ((_CurrentToken.type === "T_CHAR" || _CurrentToken.type === "T_SPACE") && parseEmptyString().type === "T_ENDQUOTES")
    {
        _CST.addNode(_CurrentToken.value, "leaf");
        return true;
    }
    // If it is a character or a a space continue to parse otherwise throw an error
    else if (_CurrentToken.type === "T_CHAR" || _CurrentToken.type === "T_SPACE")
    {
        _CST.addNode(_CurrentToken.value, "leaf");

        if (!parseCharList())
            return false;
        else
        {
            _CST.atLeaf();
        }
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting space or char.");
        _ErrorCount++;
        return false;
    }

    return true;
}

function parseBooleanExpr() {
    // Either get the boolean value or (
    _CurrentToken = parseGetNextToken();
    _CST.addNode("BooleanExpr", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // If it is true or false return true
    if (_CurrentToken.type === "T_BOOLVAL")
    {
        return true;
    }
    // If it is not a boolean value it is a whole expression
    else if (_CurrentToken.type === "T_LEFTPAREN")
    {
        if (parseLookAheadOne().type === "T_ID")
        {
            if (_SymbolTable.currentScope.isUsed(parseLookAheadOne()) === false)
            {
                putMessage("Error: Id used is never declared.");
                _ErrorCount++;
                return false;
            }
        }

        // Then parse expr
        if (!parseExpr())
            return false;
        else
        {
            _CST.atLeaf();
        }

        _CurrentToken = parseGetNextToken();

        // After parsing expr check for a boolean operation otherwise throw an error
        if (_CurrentToken.type === "T_BOOLOP")
        {
            _CST.addNode(_CurrentToken.value, "leaf");

            if (parseLookAheadOne().type === "T_ID")
            {
                if (_SymbolTable.currentScope.isUsed(parseLookAheadOne()) === false)
                {
                    putMessage("Error: Id used is never declared.");
                    _ErrorCount++;
                    return false;
                }
            }

            // Then parse expr
            if (!parseExpr())
                return false;
            else
            {
                _CST.atLeaf();
            }
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
                + " on line: " + _CurrentToken.line + " expecting == or !=.");
            _ErrorCount++;
            return false;
        }

        _CurrentToken = parseGetNextToken();

        // Check if the next token is the ) otherwise throw an error
        if (_CurrentToken.type === "T_RIGHTPAREN")
        {
            _CST.addNode(_CurrentToken.value, "leaf");

            return true;
        }
        else
        {
            putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
                + " on line: " + _CurrentToken.line + " expecting ).");
            _ErrorCount++;
            return false;
        }
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting (.");
        _ErrorCount++;
        return false;
    }
}

function parseId() {
    _CurrentToken = parseGetNextToken();
    _CST.addNode("Id", "branch");
    _CST.addNode(_CurrentToken.value, "leaf");

    // If it is an id return true otherwise throw an error
    if (_CurrentToken.type === "T_ID")
    {
        return true;
    }
    else
    {
        putMessage("Error: Unexpected token while parsing: " + _CurrentToken.toStringType()
            + " on line: " + _CurrentToken.line + " expecting id.");
        _ErrorCount++;
        return false;
    }
}

// Stop parsing
function parseStop() {
    putMessage("Please address errors and try again.");
}
