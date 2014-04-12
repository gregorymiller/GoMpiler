/* --------
 SemanticAnalysis.js

 Performs the semantic analysis.
 -------- */

function SemanticAnalysis() {
    buildSymbolTableAndAST();
}

function buildSymbolTableAndAST() {
    // Build things from the tokens so reset the token index and assign the first token
    _TokenIndex = 0;
    var token = _Tokens[_TokenIndex];

    // Go until we reach the end of file token
    while (token.type != "T_ENDOFFILE")
    {
        // If we encounter a print token add a print structure to the ast
        if (token.type === "T_PRINT")
        {
            this.addPrintAST(token);
        }
        // If we encounter a type add a variable declaration to the ast
        else if (token.type === "T_TYPE")
        {
            this.addVarDeclAST(token);
        }
        // If we encounter an id add an assignment statement to the ast
        else if (token.type === "T_ID")
        {
            this.addAssignmentAST(token);
        }
        // If we encounter an if add an if structure to the ast
        else if (token.type === "T_IF")
        {
            this.addIfAST(token);
        }
        // If we encounter a while add a while structure to the ast
        else if (token.type === "T_WHILE")
        {
            this.addWhileAST(token);
        }
        // If we encounter a left brace add a branch to the ast and start a new scope
        else if (token.type === "T_LEFTBRACE")
        {
            _AST.addNode("Statement Block", "branch");
            _SymbolTable.newScope();
        }
        // If we encounter a right brace the ast is now at a leaf and end the scope
        else if (token.type === "T_RIGHTBRACE")
        {
            _AST.atLeaf();
            _SymbolTable.endScope();
        }

        // Get the next token
        token = _Tokens[_TokenIndex];
    }
}

function addPrintAST(token) {

}

function addVarDeclAST(token) {
    // Add declare and type to the ast
    _AST.addNode("Declare", "branch");
    _AST.addNode(token.value, "leaf");

    // Save the type for type checking
    var type = token.value;

    // Get the next token
    token = _Tokens[++_TokenIndex];

    var id = token.value;
    var line = token.line;

    // If the variable is already declared throw an error else add it to the symbol table and set it as declared
    if (_SymbolTable.currentScope.isDeclared(token))
    {
        putMessage("Error: Variable " + id + " already declared in current scope on line " + line);
        stopSemanticAnalysis();
    }
    else
    {
        _SymbolTable.newSymbol(id, type);
        _SymbolTable.currentScope.setDeclared(id);
    }

    // Add the id to the ast, go back up the tree, and then move to the next token
    _AST.addNode(id, "leaf");
    _AST.atLeaf();
    _TokenIndex++;
}

function addAssignmentAST(token) {
    // Add assignment to ast
    _AST.addNode("=", "branch");

    // If the symbol is never declared throw an error
    if (!_SymbolTable.currentScope.isDeclared(token))
    {
        putMessage("Error: Variable " + token.value + " on line " + token.line + " is used but never declared.");
        stopSemanticAnalysis();
    }


    var id = token.value;
    var type = _SymbolTable.currentScope.getSymbolType(token);

    // Get = then next token
    _TokenIndex += 2;
    token = _Tokens[_TokenIndex];

    // If it is of type int and there is an intexpr coming add an int expr
    if (type === "int" && _Tokens[_TokenIndex + 1].type === "T_INTOP")
    {
        token = _Tokens[++_TokenIndex];
        addIntExprAST(token);
    }
    // If it is an int and a digit add the id and the digit
    else if (type === "int" && token.type === "T_DIGIT")
    {
        _AST.addNode(id, "leaf");
        _AST.addNode(token.value, "leaf");
    }
    // If it is a string and there are quotes add the string expression
    else if (type === "string" && token.type === "T_QUOTES")
    {
        _AST.addNode(id, "leaf");
        var stringExpr = "";

        token = _Tokens[++_TokenIndex];

        // Get all the characters in the string
        while (token.type != "T_QUOTES") {
            stringExpr += token.value;
            token = _Tokens[++_TokenIndex];
        }

        _AST.addNode(stringExpr, "leaf");
    }
    // If it is a boolean and a boolexpr is coming add it to the ast
    else if (type === "boolean" && token.type === "T_LEFTPAREN")
    {
        // Add boolean expression
    }
    // If it is a boolean and there a boolean value add the id and true/false to the ast
    else if (type === "boolean" && token.type === "T_BOOLVAL")
    {
        _AST.addNode(id, "leaf");
        _AST.addNode(token.value, "leaf");
    }
    // If we are assigning the id to another id add them both to the ast
    // THis is wrong type checking
    else if (token.type === "T_ID" && token.value === type)
    {
        _AST.addNode(id, "leaf");
        _AST.addNode(token.value, "leaf");
    }
    // Else the types do not match throw an error
    else
    {
        putMessage("Error: Type mismatch with variable " + id + " on line " + token.line);
        stopSemanticAnalysis();
    }

    // Move to the next token and move up the ast
    _TokenIndex++;
    _AST.atLeaf();
}

function addIfAST(token) {
    _AST.addNode(token.value, "branch");

    token = _Tokens[++_TokenIndex];

    // If it is just a boolean value add them to the ast and continue to parse
    if (token.type === "T_BOOLVAL")
    {
        _AST.addNode(token.value, "leaf");
    }
    // If it is a boolean expression add a boolean expression
    else if (token.type === "T_LEFTPAREN")
    {
        token = _Tokens[++_TokenIndex];
        addBooleanExprAST(token);
    }
}

function addWhileAST(token) {
    _AST.addNode(token.value, "branch");

    token = _Tokens[++_TokenIndex];

    // If it is just a boolean value add them to the ast and continue to parse
    if (token.type === "T_BOOLVAL")
    {
        _AST.addNode(token.value, "leaf");
    }
    // If it is a boolean expression add a boolean expression
    else if (token.type === "T_LEFTPAREN")
    {
        token = _Tokens[++_TokenIndex];
        addBooleanExprAST(token);
    }
}

// If there is a problem end semantic analysis
function stopSemanticAnalysis() {
    putMessage("Errors in Semantic Analysis please fix and recompile.");
    _TokenIndex = _Tokens.length;
}

function addIntExprAST(token) {
    var nextToken =  _Tokens[_TokenIndex + 1];
    var previousToken = _Tokens[_TokenIndex - 1];

    _AST.addNode(token.value, "branch");
    _AST.addNode(previousToken.value, "leaf");

    if (_Tokens[_TokenIndex + 2].type === "T_INTOP")
    {
        _TokenIndex += 2;
        token = _Tokens[_TokenIndex];
        addIntExprAST(token);
    }
    else if (nextToken.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(nextToken) === "int")
    {
        _AST.addNode(nextToken.value, "leaf");
    }
    else if (nextToken.type === "T_DIGIT")
    {
        _AST.addNode(nextToken.value, "leaf");
    }

    _TokenIndex += 2;
    _AST.atLeaf();
}

function addBooleanExprAST(token) {
    var tempIndex = _TokenIndex;
    var nextToken = _Tokens[_TokenIndex + 1];

    while (_Tokens[tempIndex].type != "T_BOOLOP")
    {
        tempIndex++;
    }

    _AST.addNode(_Tokens[tempIndex].value, "branch");

    if (nextToken.type === "T_INTOP")
    {
        token = _Tokens[++_TokenIndex];
        addIntExprAST(token);
    }
    else if (nextToken.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(nextToken) === "int")
    {
        _AST.addNode(nextToken.value, "leaf");
    }
    else if (nextToken.type === "T_DIGIT")
    {
        _AST.addNode(nextToken.value, "leaf");
    }
}