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
            _TokenIndex++;
        }
        // If we encounter a right brace the ast is now at a leaf and end the scope
        else if (token.type === "T_RIGHTBRACE")
        {
            _AST.atLeaf();
            _SymbolTable.endScope();
            _TokenIndex++;
        }

        // Get the next token
        token = _Tokens[_TokenIndex];
    }
}

function addPrintAST(token) {
    _AST.addNode("Print", "branch");

    _TokenIndex += 2;
    token = _Tokens[_TokenIndex];

    if (_Tokens[_TokenIndex + 1].type === "T_INTOP")
    {
        token = _Tokens[++_TokenIndex];
        addIntExprAST(token);
    }
    else if (token.type === "T_ID" && _SymbolTable.currentScope.isDeclared(token))
    {
        _AST.addNode(token.value, "leaf");
    }
    else if (token.type === "T_QUOTES")
    {
        var stringExpr = "";

        // Get all the characters in the string
        while (token.type != "T_QUOTES") {
            stringExpr += token.value;
            token = _Tokens[++_TokenIndex];
        }

        _AST.addNode(stringExpr, "leaf");
    }
    else if (token.type === "T_BOOLVAL")
    {
        _AST.addNode(token.value, "leaf");
    }
    else if (token.type === "T_LEFTPAREN")
    {
        token = _Tokens[++_TokenIndex];
        addBooleanExprAST(token);
    }
    else
    {
        putMessage("Something happened that shouldn't happen.");
    }

    _AST.atLeaf();
    _TokenIndex++;

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
        token = _Tokens[++_TokenIndex];
        addBooleanExprAST(token);
    }
    // If it is a boolean and there a boolean value add the id and true/false to the ast
    else if (type === "boolean" && token.type === "T_BOOLVAL")
    {
        _AST.addNode(id, "leaf");
        _AST.addNode(token.value, "leaf");
    }
    // If we are assigning the id to another id add them both to the ast
    // THis is wrong type checking
    else if (token.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(token) === type)
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
    else
    {
        putMessage("Something happened that shouldn't happen.");
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
    else
    {
        putMessage("Something happened that shouldn't happen.");
    }
}

// If there is a problem end semantic analysis
function stopSemanticAnalysis() {
    putMessage("Errors in Semantic Analysis please fix and recompile.");
    _TokenIndex = _Tokens.length;
}

function addIntExprAST(token) {
    // Get the next and previous tokens because we are in the middle of an intexpr
    var nextToken =  _Tokens[_TokenIndex + 1];
    var previousToken = _Tokens[_TokenIndex - 1];

    // Add the plus and then the previous token
    _AST.addNode(token.value, "branch");
    _AST.addNode(previousToken.value, "leaf");

    // If it is another integer expression add another intexpr
    if (_Tokens[_TokenIndex + 2].type === "T_INTOP")
    {
        _TokenIndex += 2;
        token = _Tokens[_TokenIndex];
        addIntExprAST(token);
    }
    // If it is an id check to make sure it is of type in then add the new value
    else if (nextToken.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(nextToken) === "int")
    {
        _AST.addNode(nextToken.value, "leaf");
    }
    // If it is just a digit add it
    else if (nextToken.type === "T_DIGIT")
    {
        _AST.addNode(nextToken.value, "leaf");
    }
    else
    {
        putMessage("Something happened that shouldn't happen.");
    }

    _TokenIndex += 2;
    _AST.atLeaf();
}

function addBooleanExprAST(token) {
    if (token.type === "T_LEFTPAREN")
    {
        token = _Tokens[++_TokenIndex];
    }

    var tempIndex = _TokenIndex;
    var numberOfBoolOps = 0;

    // Calculate the number of boolean operators
    while (_Tokens[tempIndex].type != "T_LEFTBRACE")
    {
        if (_Tokens[tempIndex].type === "T_BOOLOP")
            numberOfBoolOps++;
        tempIndex++;
    }

    // If there is only one boolean operator there is no need to parse more boolean expressions
    if (numberOfBoolOps === 1)
    {
        tempIndex = _TokenIndex;

        // Get the index of the boolean expression
        while (_Tokens[tempIndex].type != "T_BOOLOP")
        {
            tempIndex++;
        }

        // Add the boolean operator
        _AST.addNode(_Tokens[tempIndex].value, "branch");

        // Add the left expression
        checkForBooleanExpr(token);

        // Get the next token after the boolean operator
        token = _Tokens[_TokenIndex];

        // Add the right expression
        checkForBooleanExpr(token);
    }
    // There are more boolean expressions in the boolean expression
    else
    {
        var middleOperator =  Math.ceil(numberOfBoolOps / 2);
        tempIndex = _TokenIndex;
        numberOfBoolOps = 0;

        // Get the index of the boolean expression
        while (_Tokens[tempIndex].type != "T_LEFTBRACE")
        {
            if (_Tokens[tempIndex].type === "T_BOOLOP")
                numberOfBoolOps++;

            if (numberOfBoolOps <= middleOperator)
                tempIndex++;
        }

        // Add the boolean operator
        _AST.addNode(_Tokens[tempIndex].value, "branch");

        // Add a boolean expression on the left
        addBooleanExprAST(token);

        // Get the token after the boolean operator
        token = _Tokens[_TokenIndex];

        // Add the boolean expression on the right
        addBooleanExprAST(token);
    }

    _TokenIndex++;
    _AST.atLeaf();
}

function checkForBooleanExpr(token) {
    var nextToken = _Tokens[_TokenIndex + 1];
    if (nextToken.type === "T_INTOP")
    {
        token = _Tokens[++_TokenIndex];
        addIntExprAST(token);
        _TokenIndex += 2;
    }
    else if (token.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(token) === "int")
    {
        _AST.addNode(token.value, "leaf");
        _TokenIndex += 2;
    }
    else if (token.type === "T_DIGIT")
    {
        _AST.addNode(token.value, "leaf");
        _TokenIndex += 2;
    }
    else if (token.type === "T_ID" && _SymbolTable.currentScope.getSymbolType(token) === "boolean")
    {
        _AST.addNode(token.value, "leaf");
        _TokenIndex += 2;
    }
    else if (token.type === "T_BOOLVAL")
    {
        _AST.addNode(token.value, "leaf");
        _TokenIndex += 2;
    }
}