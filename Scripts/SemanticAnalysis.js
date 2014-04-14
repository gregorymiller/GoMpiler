/* --------
 SemanticAnalysis.js

 Performs the semantic analysis.
 -------- */

function SemanticAnalysis() {
    putMessage("Semantic  Analysis has started.");
    CSTToAST(_CST.root);
    buildSymbolTable(_AST.root);
    putMessage(_AST.toString());
}

function CSTToAST(node) {
    // If it is a number or true or false add it to the ast
    if(!isNaN(node.value) || node.value === "true" || node.value === "false") {
        _AST.addNode(node.value, node.line, "leaf");
        return;
    }

    // If it is a block continue down the middle of the cst
    if (node.value === "Block")
    {
        _AST.addNode("{}", -1, "branch");
        // Continue to statementlist
        CSTToAST(node.children[1]);
        _AST.atLeaf();
    }
    // If it is a statementlist continue down the statement then the statementlist
    else if (node.value === "StatementList")
    {
        // If there is a child of the statement continue
        if (node.children[0] != null)
            CSTToAST(node.children[0]);

        // If there is a child of  statementlist continue
        if (node.children[1] != null)
            CSTToAST(node.children[1]);
    }
    // If we are at a statement just continue
    else if (node.value === "Statement")
    {
        CSTToAST(node.children[0]);
    }
    // If it is a print statement continue down the expr
    else if (node.value === "PrintStatement")
    {
        _AST.addNode("Print", -1, "branch");

        // Expr child
        CSTToAST(node.children[2]);
        _AST.atLeaf();
    }
    // If it is an assignment statement continue down the id then the expr
    else if (node.value === "AssignmentStatement")
    {
        _AST.addNode("=", -1, "branch");

        // Id child
        CSTToAST(node.children[0]);
        // Expr child
        CSTToAST(node.children[2]);
    }
    // If it is a block continue down the statementlist child
    else if (node.value === "Block")
    {
        CSTToAST(node.children[1]);
    }
    // If it is a variable declaration add the type the continue to the id
    else if (node.value === "VarDecl")
    {
        _AST.addNode("Declare", -1, "branch");

        // Type
        _AST.addNode(node.children[0].value, node.children[0].line, "leaf");
        // Id child
        CSTToAST(node.children[1]);
        _AST.atLeaf();
    }
    // If it is an if statement continue to the boolean expression and the block
    else if (node.value === "IfStatement")
    {
        _AST.addNode("If", -1, "branch");
        // Boolean expression
        CSTToAST(node.children[1]);
        // Block
        CSTToAST(node.children[2]);
        _AST.atLeaf();
    }
    // If it is an while statement continue to the boolean expression and the block
    else if (node.value === "WhileStatement")
    {
        _AST.addNode("While", -1, "branch");
        // Boolean expression
        CSTToAST(node.children[1]);
        // Block
        CSTToAST(node.children[2]);
        _AST.atLeaf();
    }
    // If it is an integer expression it will either be a digit or a digit plus an expr
    else if (node.value === "IntExpr")
    {
        // If there is an integer operator
        if (node.children[1] != null)
        {
            // Add the integer operator
            _AST.addNode(node.children[1].value, node.children[1].line, "branch");
            // Digit
            CSTToAST(node.children[0]);
            // Expr
            CSTToAST(node.children[2]);
            _AST.atLeaf();
        }
        // Else just add the digit
        else
        {
            CSTToAST(node.children[0]);
        }
    }
    // If it is a boolean expression it will either be a boolean value or a expr/boolean operator/expr
    else if (node.value === "BooleanExpr")
    {
        // If there is a boolean operator continue to both of the exprs
        if (node.children[2] != null)
        {
            // Use the boolean operator as the new node
            _AST.addNode(node.children[2].value, node.children[2].line, "branch");
            // Left expr
            CSTToAST(node.children[1]);
            // Right expr
            CSTToAST(node.children[3]);
            _AST.atLeaf();
        }
        // Else it is just a boolean value
        else
        {
            CSTToAST(node.children[0]);
        }
    }
    // If it is a string expr continue to its child
    else if (node.value === "StringExpr")
    {
        CSTToAST(node.children[1]);
    }
    // If it is a char list obtain the whole string to add it to the ast
    else if (node.value === "CharList")
    {
        var line = node.line;
        // Get the string from all of the char lists
        var stringExpr = "\"" + addCharList(node, "") + "\"";
        _AST.addNode(stringExpr, line, "leaf");
    }
    // If it is an id add it to the ast
    else if (node.value === "Id")
    {
        _AST.addNode(node.children[0].value, node.children[0].line, "leaf");
    }
    // Else just continue to the first child
    else
    {
        if (node.children[0] != null)
            CSTToAST(node.children[0]);
    }
}

function addCharList(node, string) {
    // Add the character to the string
    string = string + node.children[0].value;

    // While there are more char lists to traverse add them to the string
    while(node.children[1] != null)
    {
        node = node.children[1];
        string = string + node.children[0].value;
    }

    return string;
}

function buildSymbolTable(node) {
    if (node.value === "{}")
    {
        _SymbolTable.newScope();

        for (var i in node.children)
        {
            buildSymbolTable(node.children[i]);
        }

        _SymbolTable.endScope();
    }
    else if (node.value === "Declare")
    {
        if (_SymbolTable.currentScope.isDeclaredInCurrentScope(node.children[1]))
        {
            putMessage("Error: Variable " + node.children[1].value + " on line " + node.children[1].line
                + " is already declared in current scope.");
            stopSemanticAnalysis();
        }
        else
        {
            _SymbolTable.newSymbol(node.children[1], node.children[0].value);
            _SymbolTable.currentScope.setDeclared(node.children[1]);
        }
    }
    else if (node.value === "=")
    {
        if (!_SymbolTable.currentScope.isDeclared(node.children[0]))
        {
            putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                + " is not declared.");
            stopSemanticAnalysis();
        }
        else
        {
            var type = _SymbolTable.currentScope.getSymbolType(node.children[0]);

            if (type === "int" && node.children[1].value === "+")
            {
                buildSymbolTable(node.children[1]);
                var intExpr = addIntExpr(node.children[1]);
                _SymbolTable.currentScope.setSymbolValue(node.children[0], intExpr);
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else if (type === "int" && !isNaN(node.children[1].value))
            {
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else if (type === "string" && node.children[1].value.indexOf("\"") != -1)
            {
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else if (type === "boolean" && (node.children[1].value === "true" || node.children[1].value === "false"))
            {
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else if (type === "boolean" && (node.children[1].value === "==" || node.children[1].value === "!="))
            {
                buildSymbolTable(node.children[1]);
                var booleanExpr = addBoolExpr(node.children[1]);
                _SymbolTable.currentScope.setSymbolValue(node.children[0], booleanExpr);
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else
            {
                putMessage("Error: Type mismatch with variable " + node.children[0].value + " on line "
                    + node.children[0].line);
            }
        }
    }
    else if (node.value === "Print")
    {
        if (node.children[0].value.indexOf("\"") === -1)
        {
            if (!_SymbolTable.currentScope.isDeclared(node.children[0]))
            {
                putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                    + " is not declared.");
                stopSemanticAnalysis();
            }
        }
    }
    else if (node.value === "If")
    {
        if (node.children[0].value === "==" || node.children[0].value === "!=")
            buildSymbolTable(node.children[0]);
    }
    else if (node.value === "While")
    {
        if (node.children[0].value === "==" || node.children[0].value === "!=")
            buildSymbolTable(node.children[0]);
    }
    else if (node.value === "+")
    {
        if (node.children[1].value === "+")
        {
            buildSymbolTable(node.children[1]);
        }
        else if (!isNaN(node.children[1].value))
        {
            return;
        }
        else if (node.children[1].value.indexOf("\"") === -1)
        {
            if (!_SymbolTable.currentScope.isDeclared(node.children[1]))
            {
                putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                    + " is not declared.");
                stopSemanticAnalysis();
            }

            if (_SymbolTable.currentScope.getSymbolType(node.children[1]) != "int")
            {
                putMessage("Error: Variable " + node.children[1].value + " on line " + node.children[1].line
                    + " is not an int.");
                stopSemanticAnalysis();
            }
        }
        else
        {
            putMessage("Error: Trying to add non int " + node.children[1].value + " on line " + node.children[1].line);
            stopSemanticAnalysis();
        }
    }
    else if (node.value === "==" || node.value === "!=")
    {
        if (node.children[0].value === "==" || node.children[0].value === "!=")
        {
            buildSymbolTable(node.children[0]);

            if (node.children[1].value === "true" || node.children[1].value === "false")
            {
                return;
            }
            else if (node.children[1].value.indexOf("\"") != -1)
            {
                return;
            }
            else if (!isNaN(node.children[1].value))
            {
                return;
            }
            else
            {
                putMessage("Error: This should never happen.");
            }
        }

        if (node.children[1].value === "==" || node.children[1].value === "!=")
        {
            buildSymbolTable(node.children[1]);

            if (node.children[0].value === "true" || node.children[0].value === "false")
            {
                return;
            }
            else if (node.children[0].value.indexOf("\"") != -1)
            {
                return;
            }
            else if (!isNaN(node.children[0].value))
            {
                return;
            }
            else
            {
                putMessage("Error: This should never happen.");
            }
        }

        if ((node.children[0].value === "true" || node.children[0].value === "false") &&
            (node.children[1].value === "true" || node.children[1].value === "false"))
        {
            return;
        }
        else if (node.children[0].value.indexOf("\"") != -1 && node.children[1].value.indexOf("\"") != -1)
        {
            return;
        }
        else if (!isNaN(node.children[0].value) && !isNaN(node.children[1].value))
        {
            return;
        }
        else
        {
            putMessage("Error: Type mismatch on line " + node.children[0].line);
            stopSemanticAnalysis();
        }
    }
}

function addIntExpr(node) {
    var intExpr = node.children[0].value + node.value;

    while(node.children[1] != "+")
    {
        node = node.children[1];
        intExpr = intExpr + node.children[0].value + node.value;
    }

    intExpr = intExpr + node.children[1].value;

    return intExpr;
}

function addBoolExpr(node) {
    var boolExpr = node.children[0].value + node.value;

    while(node.children[1] != "==" || node.children[1] != "!=")
    {
        node = node.children[1];
        boolExpr = boolExpr + node.children[0].value + node.value;
    }

    boolExpr = boolExpr + node.children[1].value;

    return boolExpr;

}

// If there is a problem end semantic analysis
function stopSemanticAnalysis() {
    putMessage("Errors in Semantic Analysis please fix and recompile.");
}