/* --------
 SymbolTable.js

 Symbol table.
 -------- */


function SymbolTable() {
    this.root = null;
    this.currentScope = null;

    // Add a new child and change the current scope
    this.newScope = function() {
        // If a scope has not been initialized yet do so otherwise create a new scope, add it as a child,
        // and then move to that scope
        if (this.currentScope === null)
        {
            this.root = new Scope(null);
            this.currentScope = this.root;
        }
        else
        {
            var scope = new Scope(this.currentScope);
            this.currentScope.children.push(scope);
            this.currentScope = scope;
        }
    };

    this.traverseScope = function() {
        if (this.currentScope === null) {
            this.currentScope = this.root;
        }
        else {
            for (var i in this.currentScope.children) {
                if (this.currentScope.children[i].visited === false) {
                    this.currentScope = this.currentScope.children[i];
                    this.currentScope.visited = true;
                }
            }
        }
    };

    // Back up from a current scope
    this.endScope = function() {
        this.currentScope = this.currentScope.parent;
    };

    // Add a new symbol to the current scope and return true or false and error handle accordingly
    this.newSymbol = function(id, type) {
        var symbol =  new Symbol(id, type, this.currentScope);
        var problems = this.currentScope.addSymbol(symbol);

        // If there are no problems just return otherwise throw an error
        if (problems)
        {
            return problems;
        }
        else
        {
            _ErrorCount++;
            putMessage("Error: Identifier used twice. Please change and recompile.");
            return problems;
        }
    };

    this.toString = function() {
        var symbolTableString = "";

        function traverse(scope, depth) {
            // Print an offset probably will never be that large so whatever
            for (var i = 0; i < depth; i++) {
                symbolTableString += " ";
            }

            // If there are no more scopes print out all the children
            if (scope.children === null)
            {
                for (var i in scope.symbols) {
                    symbolTableString += scope.symbols[i].toString() + " depth: " + depth + "\n";
                }
            }
            // If not print out all the children the call each of the children
            else
            {
                for (var i in scope.symbols) {
                    symbolTableString += scope.symbols[i].toString() + " depth: " + depth + "\n";
                }
                for (var j in scope.children) {
                    traverse(scope.children[j], depth+1);
                }
            }
        }

        traverse(this.root, 0);

        return symbolTableString;
    };
}

// The values of a symbol
var Symbol = function(id, type, scope) {
    this.id = id.value;
    this.type = type;
    this.line = id.line;
    this.value = null;
    this.used = false;
    this.declared = false;
    this.scope = scope;

    this.toString = function() {
        return "Id: " + this.id + ", Type: " + this.type + ", Line: "
            + this.line + ", Value: " + this.value + ", Used: " + this.used + ", Declared: " + this.declared;
    };
};

// The individual node properties
var Scope = function(parent) {
    this.parent = parent;
    this.children = new Array();
    this.symbols = new Array();
    this.visited = false;

    // Check if a symbol exists if it does not add it and return that it was successful
    this.addSymbol = function(symbol) {
        this.symbols.push(symbol);
        return true;
    };

    // Check each variable in the current scope to see if it already exists
    this.getSymbol = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key.value === this.symbols[i].id)
            {
                return this.symbols[i];
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return false;
        else
            var trueFalse = this.parent.getSymbol(key);

        return trueFalse;
    };

    // Sets the variable to used if it exists
    this.setUsed = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key.value === this.symbols[i].id)
            {
                this.symbols[i].used = true;
                return true;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return false;
        else
            var trueFalse = this.parent.setUsed(key);

        return trueFalse;
    };

    // Checks if the variable is in use
    this.isUsed = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if ((key.value === this.symbols[i].id) && this.symbols[i].used === true)
            {
                return true;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return false;
        else
            var trueFalse = this.parent.isUsed(key);

        return trueFalse;
    };

    // Sets the variable to declared if it exists
    this.setDeclared = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key.value === this.symbols[i].id)
            {
                this.symbols[i].declared = true;
            }
        }
    };

    // Checks if the variable is declared
    this.isDeclared = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if ((key.value === this.symbols[i].id) && this.symbols[i].declared === true)
            {
                return true;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return false;
        else
            var trueFalse = this.parent.isDeclared(key);

        return trueFalse;
    };

    // Checks if the variable is declared in current scope
    this.isDeclaredInCurrentScope = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if ((key.value === this.symbols[i].id) && this.symbols[i].declared === true)
            {
                return true;
            }
        }

        return false;
    };

    // Sets the symbols value
    this.setSymbolValue = function(key, value) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key.value === this.symbols[i].id)
            {
                this.symbols[i].value = value;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return;
        else
            this.parent.setSymbolValue(key, value);
    };

    // Gets the symbols value
    this.getSymbolValue = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key.value === this.symbols[i].id)
            {
                return this.symbols[i].value;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return false;
        else
            var value = this.parent.getSymbolValue(key);

        return value;
    };

    // Find the symbol's type else return null
    this.getSymbolType = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if ((key.value === this.symbols[i].id))
            {
                return this.symbols[i].type;
            }
        }

        // If we are at the root and it has not been found return false otherwise continue to parents
        if (this.parent === null)
            return null;
        else
            var type = this.parent.getSymbolType(key);

        return type;
    };
};