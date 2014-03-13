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

    // Back up from a current scope
    this.endScope = function() {
        this.currentScope = this.currentScope.parent;
    };

    // Add a new symbol to the current scope and return true or false and error handle accordingly
    this.newSymbol = function(id, type) {
        var symbol =  new Symbol(id, type);
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
var Symbol = function(id, type) {
    this.id = id.value;
    this.type = type.value;
    this.line = id.line;
    this.value = null;
    this.used = false;

    this.toString = function() {
        return "Id: " + this.id + ", Type: " + this.type + ", Line: "
            + this.line + ", Value: " + this.value + ", Used: " + this.used;
    };
};

// The individual node properties
var Scope = function(parent) {
    this.parent = parent;
    this.children = new Array();
    this.symbols = new Array();

    // Check if a symbol exists if it does not add it and return that it was successful
    this.addSymbol = function(symbol) {
        if (this.getSymbol(symbol.id) === false)
        {
            this.symbols.push(symbol);
            return true;
        }
        else
        {
            return false;
        }
    };

    // Check each variable in the current scope to see if it already exists
    this.getSymbol = function(key) {
        for (var i = 0; i < this.symbols.length; i++) {
            if (key === this.symbols[i].id)
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
            var trueFalse =this.parent.setUsed(key);

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
            var trueFalse =this.parent.isUsed(key);

        return trueFalse;
    };

    this.addCopySymbolInCurrentScope = function(key) {
        // Find its reference in the parent scope
        var parentSymbol = this.getSymbol(key.value);

        // If this scope is not the root of the symbol table then add it to the symbol table again
        if (this.parent != _SymbolTable.root.parent)
        {
            // Create a temporary token to use to make the symbol
            var tempToken = new Token();
            tempToken.type = parentSymbol.id;
            tempToken.value = parentSymbol.type;
            tempToken.line = parentSymbol.line;

            // Make the symbol and add it to the symbol table
            var symbol = new Symbol(key, tempToken);
            symbol.used = true;
            this.symbols.push(symbol);
        }
        else
        {
            parentSymbol.used = true;
        }
    };
};