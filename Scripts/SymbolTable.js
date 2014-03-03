/* --------
 SymbolTable.js

 Symbol table.
 -------- */


function SymbolTable() {
    this.root = new Scope(null);
    this.currentScope = this.root;

    // Add a new child and change the current scope
    this.newScope = function() {
        var scope = new Scope(this.currentScope);
        this.currentScope.children.push(scope);
        this.currentScope = scope;
    };

    // Back up from a current scope
    this.endScope = function() {
        this.currentScope = this.currentScope.parent;
    };

    // Add a new symbol to the current scope and return true or false and error handle accordingly
    this.newSymbol = function(id, type) {
        var symbol =  new Symbol(id, type);
        var problems = this.currentScope.addSymbol(symbol);

        if (problems)
        {
            return problems;
        }
        else
        {
            _ErrorCount++;
            putMessage("Error: Identifier used twice. Please change and recompile.");
        }
    };
}

// The values of a symbol
var Symbol = function(id, type) {
    this.id = id.value;
    this.type = type.value;
    this.line = id.line;
    this.value = null;
    this.used = false;
};

// The individual node properties
var Scope = function(parent) {
    this.parent = parent;
    this.children = new Array();
    this.symbols = new Array();

    // Check if a symbol exists if it does not add it and return that it was successful
    this.addSymbol = function(symbol) {
        if (this.getSymbol(symbol.id) != false)
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
            if (key.id === this.symbols[i].id)
            {
                return this.symbols[i];
            }
        }

        return false;
    };
};