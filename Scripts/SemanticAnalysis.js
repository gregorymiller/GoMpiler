/* --------
 SemanticAnalysis.js

 Performs the semantic analysis.
 -------- */

function SemanticAnalysis() {
    putMessage("Semantic  Analysis has started.");

    verbosePutMessage("Building AST.");
    CSTToAST(_CST.root);

    // If there are no errors build the symbol table
    if (_ErrorCount < 1)
    {
        verbosePutMessage("Building Symbol Table.");
        buildSymbolTable(_AST.root);
    }

    // Check for undeclared identifiers
    if (_ErrorCount < 1)
        checkForUnusedIdentifiers(_SymbolTable.root);

    // If there are no errors display the ast and the symbol table
    if (_ErrorCount < 1)
    {
        putMessage(_AST.toString());
        putMessage(_SymbolTable.toString());
    }
}

function checkForUnusedIdentifiers(node) {
    // If we are at a scope with no child scopes iterate through the symbols
    if (node.children === null)
    {
        // For each symbol check if it is declared and if it is used
        for (var i in node.symbols) {
            if (node.symbols[i].used === false && node.symbols[i].declared)
                putMessage("Warning: Variable " + node.symbols[i].id + " is declared but never used.");
        }
    }
    else
    {
        // For each symbol check if it is declared and if it is used
        for (var i in node.symbols) {
            if (node.symbols[i].used === false && node.symbols[i].declared)
                putMessage("Warning: Variable " + node.symbols[i].id + " is declared but never used.");
        }

        // For each child scope check their identifiers
        for (var j in node.children) {
            checkForUnusedIdentifiers(node.children[j]);
        }
    }
}

function CSTToAST(node) {
    // If it is a number or true or false add it to the ast
    if(!isNaN(node.value) || node.value === "true" || node.value === "false") {
        verbosePutMessage("Added node: " + node.value);
        _AST.addNode(node.value, node.line, "leaf");
        return;
    }

    // If we are at the program add it as the root
    // Did this to solve some tree traversal errors
    if (node.value === "Program")
    {
        verbosePutMessage("Encountered Program branch node added");
        _AST.addNode("Program Start", "branch");
        CSTToAST(node.children[0]);
    }
    // If it is a block continue down the middle of the cst
    else if (node.value === "Block")
    {
        verbosePutMessage("Encountered Block branch node added");
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
        verbosePutMessage("Encountered Print branch node added");
        _AST.addNode("Print", -1, "branch");

        // Expr child
        CSTToAST(node.children[2]);
        _AST.atLeaf();
    }
    // If it is an assignment statement continue down the id then the expr
    else if (node.value === "AssignmentStatement")
    {
        verbosePutMessage("Encountered Assignment branch node added");
        _AST.addNode("=", -1, "branch");

        // Id child
        CSTToAST(node.children[0]);
        // Expr child
        CSTToAST(node.children[2]);
        _AST.atLeaf();
    }
    // If it is a block continue down the statementlist child
    else if (node.value === "Block")
    {
        CSTToAST(node.children[1]);
    }
    // If it is a variable declaration add the type the continue to the id
    else if (node.value === "VarDecl")
    {
        verbosePutMessage("Encountered VarDecl branch node added");
        _AST.addNode("Declare", -1, "branch");

        verbosePutMessage("Added node: " + node.children[0].value);
        // Type
        _AST.addNode(node.children[0].value, node.children[0].line, "leaf");
        // Id child
        CSTToAST(node.children[1]);
        _AST.atLeaf();
    }
    // If it is an if statement continue to the boolean expression and the block
    else if (node.value === "IfStatement")
    {
        verbosePutMessage("Encountered If branch node added");
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
        verbosePutMessage("Encountered While branch node added");
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
            verbosePutMessage("Encounter + branch node added");
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
            verbosePutMessage("Encounter boolean operator branch node added");
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

        verbosePutMessage("Added string expression: " + stringExpr);
    }
    // If it is an id add it to the ast
    else if (node.value === "Id")
    {
        verbosePutMessage("Added node: " + node.children[0].value);
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
    // If we are at the root of the ast continue down to block
    if (node.value === "Program Start")
    {
        buildSymbolTable(node.children[0]);
    }
    else if (node.value === "{}")
    {
        // Start a new scope
        _SymbolTable.newScope();
        verbosePutMessage("New scope started");

        // Visit each of the children in the scope
        for (var i in node.children)
        {
            buildSymbolTable(node.children[i]);
        }

        // End the scope after all the children are visited
        _SymbolTable.endScope();
        verbosePutMessage("Scope ended");
    }
    else if (node.value === "Declare")
    {
        // If the variable is already declared in the current scope throw an error
        // else add it to the symbol table and flag it as declared
        if (_SymbolTable.currentScope.isDeclaredInCurrentScope(node.children[1]))
        {
            _ErrorCount++;
            putMessage("Error: Variable " + node.children[1].value + " on line " + node.children[1].line
                + " is already declared in current scope.");
            stopSemanticAnalysis();
        }
        else
        {
            verbosePutMessage("Variable " + node.children[0].value + " successfully declared");
            _SymbolTable.newSymbol(node.children[1], node.children[0].value);
            _SymbolTable.currentScope.setDeclared(node.children[1]);
        }
    }
    else if (node.value === "=")
    {
        // If the variable is never declared throw an error
        if (!_SymbolTable.currentScope.isDeclared(node.children[0]))
        {
            _ErrorCount++;
            putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                + " is not declared.");
            stopSemanticAnalysis();
        }
        else
        {
            // Get the type of the variable we are assigning
            var type = _SymbolTable.currentScope.getSymbolType(node.children[0]);

            // Type int and an integer expression
            if (type === "int" && node.children[1].value === "+")
            {
                // Continue to check on the + in case their are identifiers in the integer expression
                buildSymbolTable(node.children[1]);

                // Get the integer value of the expression
                var intExpr = addIntExpr(node.children[1]);

                // Set the value of the identifier and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], intExpr);
                _SymbolTable.currentScope.setUsed(node.children[0]);

                verbosePutMessage("Trying to match variable " + node.children[0].value + " with integer expression");

                // If there are errors in building the integer expression do not "add" it
                if (_ErrorCount < 1)
                    verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Assigning one identifier to another
            // Check that types match
            else if ((type === _SymbolTable.currentScope.getSymbolType(node.children[1])
                    && _SymbolTable.currentScope.isUsed(node.children[1])))
            {
                verbosePutMessage("Trying to match variable " + node.children[0].value + " variable "
                                    + node.children[1].value + " with type " + type);

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], _SymbolTable.currentScope.getSymbolValue(node.children[1]));
                _SymbolTable.currentScope.setUsed(node.children[0]);

                verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Type int and a digit
            else if (type === "int" && !isNaN(node.children[1].value))
            {
                verbosePutMessage("Trying to match variable " + node.children[0].value + " with integer");

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);

                verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Type string and a string expression
            else if (type === "string" && node.children[1].value.indexOf("\"") != -1)
            {
                verbosePutMessage("Trying to match variable " + node.children[0].value + " with string");

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);

                verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Type boolean with a boolean value
            else if (type === "boolean" && (node.children[1].value === "true" || node.children[1].value === "false"))
            {
                verbosePutMessage("Trying to match variable " + node.children[0].value + " with boolean");

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], node.children[1].value);
                _SymbolTable.currentScope.setUsed(node.children[0]);

                verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Type boolean with a boolean expression
            else if (type === "boolean" && (node.children[1].value === "==" || node.children[1].value === "!="))
            {
                // Check to make sure the boolean expression is valid
                buildSymbolTable(node.children[1]);

                // Get the boolean expression to add it as the value
                var booleanExpr = addBoolExpr(node.children[1]);

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], booleanExpr);
                _SymbolTable.currentScope.setUsed(node.children[0]);


                verbosePutMessage("Trying to match variable " + node.children[0].value + " with boolean expression");

                // If there are errors do not "add" the boolean expression
                if (_ErrorCount < 1)
                    verbosePutMessage("Variable " + node.children[0].value + " added");
            }
            // Assigning one identifier to another but the other is never initialized
            else if ((type === _SymbolTable.currentScope.getSymbolType(node.children[1])
                && (!_SymbolTable.currentScope.isUsed(node.children[1]) && _SymbolTable.currentScope.isDeclared(node.children[1]))))
            {
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized.");

                // Set the value and flag it as used
                _SymbolTable.currentScope.setSymbolValue(node.children[0], _SymbolTable.currentScope.getSymbolValue(node.children[1]));
                _SymbolTable.currentScope.setUsed(node.children[0]);
            }
            else
            {
                _ErrorCount++;
                putMessage("Error: Type mismatch with variable " + node.children[0].value + " on line "
                    + node.children[0].line);
            }
        }
    }
    else if (node.value === "Print")
    {
        // Only need to check for identifiers because parse will guarantee correct things in print
        if (node.children[0].value.length === 1 && isNaN(node.children[0].value) && node.children[0].value != "+")
        {
            verbosePutMessage("Checking that variable " + node.children[0].value + " is declared");

            // If a variable is never declared throw an error
            if (!_SymbolTable.currentScope.isDeclared(node.children[0]))
            {
                _ErrorCount++;
                putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                    + " is not declared.");
                stopSemanticAnalysis();
            }
            // If it is declared but never initialized issue a warning
            else
            {
                if (!_SymbolTable.currentScope.isUsed(node.children[0]))
                {
                    putMessage("Warning: Variable " + node.children[0].value + " is never initialized");
                }
            }
        }
    }
    else if (node.value === "If")
    {
        // If it is a boolean expression check that it is valid
        if (node.children[0].value === "==" || node.children[0].value === "!=")
            buildSymbolTable(node.children[0]);

        // Check the block
        buildSymbolTable(node.children[1]);
    }
    else if (node.value === "While")
    {
        // If it is a boolean expression check that it is valid
        if (node.children[0].value === "==" || node.children[0].value === "!=")
            buildSymbolTable(node.children[0]);

        // Check the block
        buildSymbolTable(node.children[1]);
    }
    else if (node.value === "+")
    {
        verbosePutMessage("Checking integer expression");

        // If there are more things to be added continue to check them
        if (node.children[1].value === "+")
        {
            buildSymbolTable(node.children[1]);
        }
        // If it is only a number it is fine just return
        else if (!isNaN(node.children[1].value))
        {
            return;
        }
        // If it is an identifier check that it is of type int
        else if (_SymbolTable.currentScope.getSymbolType(node.children[1]) != "int")
        {
            _ErrorCount++;
            putMessage("Error: Variable " + node.children[1].value + " on line " + node.children[1].line
                + " is not an int.");
            stopSemanticAnalysis();
        }
        // If it is an identifier of type int check that it is initialized otherwise issue a warning
        else if (_SymbolTable.currentScope.getSymbolType(node.children[1]) === "int")
        {
            if (!_SymbolTable.currentScope.isUsed(node.children[1]))
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

            verbosePutMessage("Variable " + node.children[1].value + " is in an integer expression and is an integer");
            return;
        }
        else
        {
            _ErrorCount++;
            putMessage("Error: Trying to add non int " + node.children[1].value + " on line " + node.children[1].line);
            stopSemanticAnalysis();
        }
    }
    else if (node.value === "==" || node.value === "!=")
    {
        verbosePutMessage("Checking boolean expression");

        // If the left child is another boolean operator continue to check
        if (node.children[0].value === "==" || node.children[0].value === "!=")
        {
            buildSymbolTable(node.children[0]);

            if (node.children[1].value === "==" || node.children[1].value === "!=")
            {
                // Will be handled by the other if statement
            }
            // Check that  if the right child is an identifier that it is declared
            else if (!_SymbolTable.currentScope.isDeclared(node.children[1]))
            {
                _ErrorCount++;
                putMessage("Error: Variable " + node.children[1].value + " on line " + node.children[1].line
                    + " is not declared.");
                stopSemanticAnalysis();
            }
            // If it is declared check if it is initialized
            else if (_SymbolTable.currentScope.isDeclared(node.children[1]))
            {
                if (!_SymbolTable.currentScope.isUsed(node.children[1]))
                    putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

                verbosePutMessage("Left child is a boolean operator, and right child is a valid id");
                return;
            }
            else
            {
                _ErrorCount++;
                putMessage("Error: This should never happen.");
            }
        }

        if (node.children[1].value === "==" || node.children[1].value === "!=")
        {
            buildSymbolTable(node.children[1]);

            if (node.children[0].value === "==" || node.children[0].value === "!=")
            {
                // Will be handled by the other if statement
            }
            // Check that  if the left child is an identifier that it is declared
            else if (!_SymbolTable.currentScope.isDeclared(node.children[0]))
            {
                _ErrorCount++;
                putMessage("Error: Variable " + node.children[0].value + " on line " + node.children[0].line
                    + " is not declared.");
                stopSemanticAnalysis();
            }
            // If it is declared check if it is initialized
            else if (_SymbolTable.currentScope.isDeclared(node.children[0]))
            {
                if (!_SymbolTable.currentScope.isUsed(node.children[0]))
                    putMessage("Warning: Variable " + node.children[0].value + " is never initialized");

                verbosePutMessage("Left child is a boolean operator, and right child is a valid id");
                return;
            }
            else
            {
                _ErrorCount++;
                putMessage("Error: This should never happen.");
            }
        }

        // Made these variables to make the first statement easier to read
        var child1TrueOrFalse = (node.children[0].value === "true" || node.children[0].value === "false");
        var child2TrueOrFalse = (node.children[1].value === "true" || node.children[1].value === "false");
        var child1IdType = _SymbolTable.currentScope.getSymbolType(node.children[0]);
        var child2IdType = _SymbolTable.currentScope.getSymbolType(node.children[1]);

        // Check that the two things being compared are boolean values or identifiers of type boolean
        // If a variable is used check that we are using the right variable then see if it is initialized
        if ((child1TrueOrFalse && child2TrueOrFalse) || (child1TrueOrFalse && child2IdType === "boolean")
            || (child2TrueOrFalse && child1IdType === "boolean"))
        {
            if (!_SymbolTable.currentScope.isUsed(node.children[1]) && _SymbolTable.currentScope.isDeclared(node.children[1]))
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

            if (!_SymbolTable.currentScope.isUsed(node.children[0]) && _SymbolTable.currentScope.isDeclared(node.children[0]))
                putMessage("Warning: Variable " + node.children[0].value + " is never initialized");

            verbosePutMessage("Both children of a boolean operator are booleans or of type boolean");
            return;
        }
        // Check that the two things being compared are string values or identifiers of type string
        // If a variable is used check that we are using the right variable then see if it is initialized
        else if ((node.children[0].value.indexOf("\"") != -1 && node.children[1].value.indexOf("\"") != -1)
                 || (node.children[1].value.indexOf("\"") != -1 && child1IdType === "string")
                 || (node.children[0].value.indexOf("\"") != -1 && child2IdType === "string"))
        {
            if (!_SymbolTable.currentScope.isUsed(node.children[1]) && _SymbolTable.currentScope.isDeclared(node.children[1]))
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

            if (!_SymbolTable.currentScope.isUsed(node.children[0]) && _SymbolTable.currentScope.isDeclared(node.children[0]))
                putMessage("Warning: Variable " + node.children[0].value + " is never initialized");

            verbosePutMessage("Both children of a boolean operator are strings or of type string");
            return;
        }
        // Check that the two things being compared are integer values or identifiers of type integer
        // If a variable is used check that we are using the right variable then see if it is initialized
        else if ((!isNaN(node.children[0].value) && !isNaN(node.children[1].value))
                 || (!isNaN(node.children[0].value) && child2IdType === "int")
                 || (!isNaN(node.children[1].value) && child1IdType === "int"))
        {
            if (!_SymbolTable.currentScope.isUsed(node.children[1]) && _SymbolTable.currentScope.isDeclared(node.children[1]))
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

            if (!_SymbolTable.currentScope.isUsed(node.children[0]) && _SymbolTable.currentScope.isDeclared(node.children[0]))
                putMessage("Warning: Variable " + node.children[0].value + " is never initialized");

            verbosePutMessage("Both children of a boolean operator are integers or of type integer");
            return;
        }
        // Check that the two identifiers that are being compared are the same type and that they exist
        // If a variable is used check that we are using the right variable then see if it is initialized
        else if ((child1IdType === child2IdType) && child1IdType != null)
        {
            if (!_SymbolTable.currentScope.isUsed(node.children[1]))
                putMessage("Warning: Variable " + node.children[1].value + " is never initialized");

            if (!_SymbolTable.currentScope.isUsed(node.children[0]))
                putMessage("Warning: Variable " + node.children[0].value + " is never initialized");

            verbosePutMessage("Both children of a boolean operator are ids of the same type");
            return;
        }
        // If both children do nothing as the other statements will take care of this case
        else if ((node.children[0].value === "==" || node.children[0].value === "!=") && (node.children[1].value === "==" || node.children[1].value === "!="))
        {
            return;
        }
        else
        {
            _ErrorCount++;
            var line = node.children[0].line;

            if (line === -1)
                line = node.children[1].line;
            putMessage("Error: Type mismatch on line " + line);
            stopSemanticAnalysis();
        }
    }
}

function addIntExpr(node) {
    // Get the integer value of the left node
    var intExpr = parseInt(node.children[0].value);

    // Continue to travers the tree if there are still things to be added
    // and add the left node as we go
    while(node.children[1].value === "+")
    {
        node = node.children[1];
        intExpr = intExpr + parseInt(node.children[0].value);
    }

    // If it is just a digit just add it otherwise add the identifier's integer value
    // Type checking will be handled in the main function
    if (_SymbolTable.currentScope.getSymbolValue(node.children[1]) === false)
        intExpr = intExpr + parseInt(node.children[1].value);
    else
        intExpr = intExpr + parseInt(_SymbolTable.currentScope.getSymbolValue(node.children[1]));

    return intExpr;
}

function addBoolExpr(node) {
     var boolExpr = "";

    // If both the children are boolean operators traverse through each of them
    if ((node.children[0].value === "==" || node.children[0].value === "!=")
        && (node.children[1].value === "==" || node.children[1].value === "!="))
        return boolExpr + "(" + addBoolExpr(node.children[0]) + ")" + node.value + "(" + addBoolExpr(node.children[1]) + ")";

    // If only one is a boolean operator add the other node's value and the operator then traverse down the boolean operator
    if (node.children[0].value === "==" || node.children[0].value === "!=")
    {
        return boolExpr + "(" +  addBoolExpr(node.children[0]) + ")" + node.value + node.children[1].value;
    }

    if (node.children[1].value === "==" || node.children[1].value === "!=")
    {
        return boolExpr + node.children[0].value + node.value + "(" +  addBoolExpr(node.children[1]) + ")";
    }

    // return the two things being compared and the boolean operator
    return boolExpr + node.children[0].value + node.value + node.children[1].value;
}

// If there is a problem end semantic analysis
function stopSemanticAnalysis() {
    putMessage("Errors in Semantic Analysis please fix and recompile.");
}