/* --------
 Parse.js

 Parses the tokens.
 -------- */


function parseProgram() {
    putMessage("Parsing has started.");

    _CST.addNode("Program", -1, "branch");

    // If parse block returns true try to parse the EOF otherwise stop parsing
    if (parseBlock())
    {
        _CST.atLeaf();
        // If the EOF is parsed correctly finish parsing
        if (!parseEndOfFile())
            parseStop();
    }
    else
    {
        parseStop();
    }

    // If parsing returned no errors output complete and if verbose out put the cst
    if (_ErrorCount < 1)
    {
        putMessage("Parsing complete.");

        verbosePutMessage("The concrete syntax tree is:");
        verbosePutMessage(_CST.toString());

        SemanticAnalysis();
    }
}

function parseEndOfFile() {
    // If the next token to be parsed is the end of file return true otherwise throw an error
    if (parseLookAheadOne().type === "T_ENDOFFILE")
    {
        _CurrentToken = parseGetNextToken();

        // Add as a leaf to the cst
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Add the block branch to the cst
    _CST.addNode("Block", -1, "branch");

    // Check for { else throw an error
    if (parseLookAheadOne().type === "T_LEFTBRACE")
    {
        _CurrentToken = parseGetNextToken();

        // Add a leaf node to the cst
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
        // If parseStatementList returned with no errors the cst is then at a leaf since
        // there is nothing left to parse it must go back to block
        _CST.atLeaf();

        // If all statements are parsed try to parse } else throw an error
        if (parseLookAheadOne().type === "T_RIGHTBRACE")
        {
            _CurrentToken = parseGetNextToken();

            // Add a leaf node to the cst
            _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Add parseStatementList as a branch to the cst
    _CST.addNode("StatementList", -1, "branch");

    // If you can look ahead and see } then return true because of the epsilon transition
    if (parseEmptyString().type === "T_RIGHTBRACE")
    {
        return true;
    }

    // Parse a statement then statementlist return true or false depending on if parse correctly
    if (parseStatement())
    {
        // If parseStatement executed correctly it means we are done parsing it so we are now at a leaf node
        // and must return
        _CST.atLeaf();

        // Then parseStatementList because there is more to be parsed
        if (parseStatementList())
        {
            // If parseStatementList executed correctly it means we are done parsing it so we are now at a leaf node
            // and must return
            _CST.atLeaf();
            return true;
        }
        else
        {
            return false;
        }
    }
    else
    {
        return false;
    }
}

// Look ahead one to represent an epsilon transition
function parseEmptyString() {
    return parseLookAheadOne();
}

function parseStatement() {
    // Add the statement branch to the cst
    _CST.addNode("Statement", -1, "branch");

    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // See if it is any of the acceptable token then call depending on that
    // If there are problems in the recursion return false and if it is not a correct token
    // throw an error
    if (tempToken === "T_PRINT") {
        if (!parsePrintStatement())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_ID") {
        if (!parseAssignmentStatement())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_TYPE") {
        if (!parseVarDecl())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_WHILE") {
        if (!parseWhileStatement())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_IF") {
        if (!parseIfStatement())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_LEFTBRACE")
    {
        if (!parseBlock())
        {
            return false;
        }
        else
        {
            // If it was parsed correctly we know that we are done parsing that statement or block
            // and we are at a leaf node then
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
    // Get the current token
    _CurrentToken = parseGetNextToken();

    // Add printStatement as a branch and print as a leaf
    _CST.addNode("PrintStatement", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // If it is a print statement check for a ( then parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_LEFTPAREN")
    {
        // Set ( as the current token then add it as a leaf to the cst
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

        // Parse expr if there are no problems it is done parsing expr and is then at a leaf otherwise there has
        // been an error so continue to return false
        if (!parseExpr())
            return false;
        else
            _CST.atLeaf();
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
        // Set ) as the current token then add it as a leaf to the cst
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Get the next token
    _CurrentToken = parseGetNextToken();

    // Add assignmentStatement and id as branches
    _CST.addNode("AssignmentStatement", -1, "branch");
    _CST.addNode("Id", -1, "branch");

    // Then add the current id as a leaf then you are at a leaf because of the id branch
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
    _CST.atLeaf();

    // If the next token is = parse expr otherwise throw an error
    if (parseLookAheadOne().type === "T_ASSIGNMENT")
    {
        // Add = as a leaf to the cst
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

        // Parse expr if there are no problems it is done parsing expr and is then at a leaf otherwise there has
        // been an error so continue to return false
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
    // Get the current token
    _CurrentToken = parseGetNextToken();

    // Add varDecl as a branch and the the id as a leaf
    _CST.addNode("VarDecl", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // Parse id error handling will be handled in the called function
    if (!parseId())
    {
        return false;
    }
    else
    {
        // If parseId executed correctly you are then at a leaf node and must return
        _CST.atLeaf();
        return true;
    }
}
function parseWhileStatement() {
    // Get the next token
    _CurrentToken = parseGetNextToken();

    // Add whileStatement as a branch and while as a leaf to the cst
    _CST.addNode("WhileStatement", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // Parse a boolean expression then a block of the while
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    else
        _CST.atLeaf();

    if (!parseBlock())
        return false;
    else
        _CST.atLeaf();

    return true;
}
function parseIfStatement() {
    // Get next token
    _CurrentToken = parseGetNextToken();

    // Add ifStatement to the cst and if as a leaf
    _CST.addNode("IfStatement", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // Parse a boolean expression then a block of the if
    // Error handling done in methods
    if (!parseBooleanExpr())
        return false;
    else
        _CST.atLeaf();

    if (!parseBlock())
        return false;
    else
        _CST.atLeaf();

    return true;
}

function parseExpr() {
    // Add expr as a branch
    _CST.addNode("Expr", -1, "branch");

    // Get the next token
    var tempToken = parseLookAheadOne().type;

    // Check for a correct token otherwise throw an error
    // If there is a problem in method calls return false
    if (tempToken === "T_DIGIT")
    {
        if (!parseIntExpr())
        {
            return false;
        }
        else
        {
            // If the expr or id was parsed correctly then you are now at a leaf node and must return
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_QUOTES")
    {
        if (!parseStringExpr())
        {
            return false;
        }
        else
        {
            // If the expr or id was parsed correctly then you are now at a leaf node and must return
            _CST.atLeaf();
           return true;
        }
    }
    else if (tempToken === "T_LEFTPAREN" || tempToken === "T_BOOLVAL")
    {
        if (!parseBooleanExpr())
        {
            return false;
        }
        else
        {
            // If the expr or id was parsed correctly then you are now at a leaf node and must return
            _CST.atLeaf();
            return true;
        }
    }
    else if (tempToken === "T_ID")
    {
        if (!parseId())
        {
            return false;
        }
        else
        {
            // If the expr or id was parsed correctly then you are now at a leaf node and must return
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
    // Get the current token
    _CurrentToken = parseGetNextToken();

    // Look at the next token to see if it +
    var tempNextToken = parseLookAheadOne().type;

    // Add intExpr as a branch to the cst
    _CST.addNode("IntExpr", -1, "branch");


    // If the current token is a digit and it is followed by a plus parse expr
    // Throw an error if digit is not found
    if (_CurrentToken.type === "T_DIGIT" && tempNextToken === "T_INTOP")
    {
        // Add the digit as a leaf
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

        // Get the + then add it as a leaf to the cst
        _CurrentToken = parseGetNextToken();
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

        // Parse expr if there are no problems it is done parsing expr and is then at a leaf otherwise there has
        // been an error so continue to return false
        if (!parseExpr())
            return false;
        else
            _CST.atLeaf();
    }
    // If it is just a digit add it to the cst return true
    else if (_CurrentToken.type === "T_DIGIT")
    {
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Get next token
    _CurrentToken = parseGetNextToken();

    // Add stringExpr as a branch and " as a leaf
    _CST.addNode("StringExpr", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // If the next token is not an end quote then parseCharList
    if (parseEmptyString().type != "T_ENDQUOTES")
    {
        // Parse char list if there is a problem return false
        if (!parseCharList())
            return false;
        else
            _CST.atLeaf();
    }

    _CurrentToken = parseGetNextToken();

    // If the next token is the end quote add it as a leaf
    // If the next token is not a end quote throw an error
    if (_CurrentToken.type === "T_ENDQUOTES")
    {
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Get next token
    _CurrentToken = parseGetNextToken();

    // Add charList as a branch to the cst
    _CST.addNode("CharList", -1, "branch");

    // See if the next token is the end quote for an epsilon transition, but still check the current token
    if ((_CurrentToken.type === "T_CHAR" || _CurrentToken.type === "T_SPACE") && parseEmptyString().type === "T_ENDQUOTES")
    {
        // Add the current token as a leaf
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
        return true;
    }
    // If it is a character or a a space continue to parse otherwise throw an error
    else if (_CurrentToken.type === "T_CHAR" || _CurrentToken.type === "T_SPACE")
    {
        // Add it as a leaf to the cst
        _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

        // Continue to parse charList until end quote or error
        if (!parseCharList())
            return false;
        else
            _CST.atLeaf();
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

    // Add booleanExpr as a branch then a boolean value or ( as a leaf
    _CST.addNode("BooleanExpr", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

    // If it is true or false return true
    if (_CurrentToken.type === "T_BOOLVAL")
    {
        return true;
    }
    // If it is not a boolean value it is a whole expression
    else if (_CurrentToken.type === "T_LEFTPAREN")
    {
        // Parse expr if there are no problems it is done parsing expr and is then at a leaf otherwise there has
        // been an error so continue to return false
        if (!parseExpr())
            return false;
        else
            _CST.atLeaf();

        _CurrentToken = parseGetNextToken();

        // After parsing expr check for a boolean operation otherwise throw an error
        if (_CurrentToken.type === "T_BOOLOP")
        {
            // Add the boolop as a leaf
            _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

            // Parse expr if there are no problems it is done parsing expr and is then at a leaf otherwise there has
            // been an error so continue to return false
            if (!parseExpr())
                return false;
            else
                _CST.atLeaf();
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
            // Add ) as a leaf to the cst
            _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");
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
    // Get the next token
    _CurrentToken = parseGetNextToken();

    // Add the id branch and the current token's value as a leaf
    _CST.addNode("Id", -1, "branch");
    _CST.addNode(_CurrentToken.value, _CurrentToken.line, "leaf");

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
