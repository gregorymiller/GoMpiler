/* --------
 CodeGeneration.js

 Performs the code generation.
 -------- */

function codeGeneration() {

    putMessage("Starting Code Generation");

    generateProgramCode(_AST.root);
    backPatch();

    // If the program is too large throw an error
    if (_ProgramCode.length > 256) {
        putMessage("Code generated larger than 256 bytes. Please try smaller code");
        _ErrorCount++;
    }

    // Fill the rest of the code with zeroes
    for (var i = 0; i < 256; i++) {
        if (_ProgramCode[i] === undefined) {
            _ProgramCode[i] = "00";
        }
    }

    // If there are no errors print out the code
    if (_ErrorCount < 1) {
        var code = _ProgramCode.join(" ");
        document.getElementById("taCode").value = code;
    }
    else {
        putMessage("There were errors in your code generation. Try again");
    }
}

function generateProgramCode(node) {
    // If the code and the heap collide throw an error
    if (_HeapLocation < _CodeLocation) {
        putMessage("Stack-Heap Collision.");
        _ErrorCount++;
        // Reset the locations so that it does not print it repeatedly
        _CodeLocation = 0;
        _HeapLocation = 255;
        return;
    }

    if (node.value === "Program Start") {
        generateProgramCode(node.children[0]);
    }
    else if (node.value === "{}") {
        // Traverse the scope
        _SymbolTable.traverseScope();

        // Visit each child
        for (var i in node.children) {
            generateProgramCode(node.children[i]);
        }

        // End the scope
        _SymbolTable.endScope();
    }
    else if (node.value === "Print") {
        // Get the node of what is being printed
        var child = node.children[0];

        // The node is an id
        if (child.value.length === 1 && isNaN(child.value)) {
            var type = _SymbolTable.currentScope.getSymbolType(child);

            // If it is an integer or boolean just print out the value
            if (type === "int" || type === "boolean") {
                var tempKey = getReferenceKey(child);

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "01";

                _ProgramCode[_CodeLocation++] = "AC";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "FF";
            }
            // If it is a string load the x register with 2 instead of 1 to print the string
            else {
                var tempKey = getReferenceKey(child);

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                _ProgramCode[_CodeLocation++] = "AC";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "FF";
            }
        }
        // If it is a string put it in the heap the print it out
        else if (child.value.indexOf("\"") != -1) {
            var string = child.value.replace(/"/g, "");

            var tempHeap = _HeapLocation - string.length;

            // Put the characters on the heap
            for (var i = 0; i < string.length; i++) {
                _ProgramCode[tempHeap++] =  string.charCodeAt(i).toString(16).toUpperCase();
            }
            _ProgramCode[tempHeap] = "00";

            _HeapLocation = _HeapLocation - string.length;

            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "02";

            _ProgramCode[_CodeLocation++] = "A0";
            _ProgramCode[_CodeLocation++] = _HeapLocation.toString(16).toUpperCase();
            _ProgramCode[_CodeLocation++] = "FF";

            _HeapLocation--;

        }
        // If it is true or false just print out those string values
        else if (child.value === "true" || child.value === "false") {
            var tempHeap = _HeapLocation - child.value.length;

            // Put the characters on the heap
            for (var i = 0; i < child.value.length; i++) {
                _ProgramCode[tempHeap++] = child.value.charCodeAt(i).toString(16).toUpperCase();
            }
            _ProgramCode[tempHeap] = "00";

            _HeapLocation = _HeapLocation - child.value.length;

            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "02";

            _ProgramCode[_CodeLocation++] = "A0";
            _ProgramCode[_CodeLocation++] = _HeapLocation.toString(16).toUpperCase();
            _ProgramCode[_CodeLocation++] = "FF";

            _HeapLocation--;
        }
        else if (child.value === "==" || child.value === "!=") {

        }
        // Otherwise it is an integer expression
        else {
            var hex = [];
            addIntegerExpression(hex, child);

            // Load the first value into memory
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = hex[0];
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            // If there are more values add them
            for (var i = 1; i < hex.length; i++) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                _ProgramCode[_CodeLocation++] = "6D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";
            }

            // Print the values that have been calculated
            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "01";

            _ProgramCode[_CodeLocation++] = "AC";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            _ProgramCode[_CodeLocation++] = "FF";
        }
    }
    else if (node.value === "=") {
        var id = node.children[0];
        var value = node.children[1];
        var type = _SymbolTable.currentScope.getSymbolType(id);
        var tempKey = getReferenceKey(id);

        if (type === "int") {
            var hex = [];
            addIntegerExpression(hex, value);

            // Get the first number in the integer expression and store it in the variable location
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = hex[0];
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = tempKey;
            _ProgramCode[_CodeLocation++] = "00";

            // Add the values and store them in the variable location
            for (var i = 1; i < hex.length; i++) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                _ProgramCode[_CodeLocation++] = "6D";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";
            }
        }
        // If it is a boolean get the value of it and store it in the variable location
        else if (type === "boolean") {
            var boolean = addBooleanExpression(value);

            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = boolean;
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = tempKey;
            _ProgramCode[_CodeLocation++] = "00";
        }
        else if (type === "string") {
            // If it is another variable store that variables reference in the current variables location
            if (value.value.length === 1) {
                var idReference = getReferenceKey(value);

                _ProgramCode[_CodeLocation++] = "AD";
                _ProgramCode[_CodeLocation++] = idReference;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";
            }
            // Otherwise put the string on the heap and store the heap location in the variable location
            else {
                value = value.value.replace(/"/g, "");

                var tempHeap = _HeapLocation - value.length;

                for (var i = 0; i < value.length; i++) {
                    _ProgramCode[tempHeap++] =  value.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                _HeapLocation = _HeapLocation - value.length;

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = _HeapLocation.toString(16).toUpperCase();

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _HeapLocation--;
            }
        }
    }
    // Put zeroes in the location where the variable will be stored
    else if (node.value === "Declare") {
        var id = node.children[1];

        _ProgramCode[_CodeLocation++] = "A9";
        _ProgramCode[_CodeLocation++] = "00";

        _ProgramCode[_CodeLocation++] = "8D";
        _ProgramCode[_CodeLocation++] = getReferenceKey(id);
        _ProgramCode[_CodeLocation++] = "00";
    }
    else if (node.value === "If") {
        var booleanExpression = node.children[0];
        var block = node.children[1];

        // For each expression in the child, so true/false or a boolean expression
        for (var i = 0; i < booleanExpression.children.length; i++) {
            // If it is  an integer compute its value and store it to be compared
            if (booleanExpression.children[i].value === "+" || !isNaN(booleanExpression.children[i].value)) {
                var hex = [];
                addIntegerExpression(hex, booleanExpression.children[i]);

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[0];
                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";

                for (var j = 1; j < hex.length; j++) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[j];

                    _ProgramCode[_CodeLocation++] = "6D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";

                    _ProgramCode[_CodeLocation++] = "8D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }

                // If it is the first value store it in the x register
                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
            // If it a variable get the value from the variable location
            else if (booleanExpression.children[i].value.length === 1) {
                var id = booleanExpression.children[i];
                var tempKey = getReferenceKey(id);

                // If it is the first value store in it the x register
                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = tempKey;
                    _ProgramCode[_CodeLocation++] = "00";
                }
                // If it is the second value store it in the 00 memory location
                else {
                    _ProgramCode[_CodeLocation++] = "AD";
                    _ProgramCode[_CodeLocation++] = tempKey;
                    _ProgramCode[_CodeLocation++] = "00";

                    _ProgramCode[_CodeLocation++] = "8D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
            // If it is a true/false store it in the memory location 00 or in the x register depending on if it is the first or second value
            else if (booleanExpression.children[i].value === "true" || booleanExpression.children[i].value === "false") {
                var boolean = addBooleanExpression(booleanExpression.children[i]);

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";

                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
        }

        if (booleanExpression.value === "==") {
            // Add the comparison and a jump
            var jump = getJumpKey();
            _ProgramCode[_CodeLocation++] = "EC";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jump;

            // Store the current code location
            var beginLocation = _CodeLocation;

            // Generate the code
            generateProgramCode(block);

            // Compute the jump distance
            var endLocation = _CodeLocation - beginLocation;

            endLocation = endLocation.toString(16).toUpperCase();

            // If it is only one digit add a zero
            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            // Replace all of those jumps with the jump distance
            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
            }
        }
        else if (booleanExpression.value === "!=") {

        }
        // If it is straight true just generate the block do not jump
        else if (booleanExpression.value === "true") {
            generateProgramCode(block);
        }
        // If it is false do not even compare just jump
        else if (booleanExpression.value === "false") {
            var jump = getJumpKey();
            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jump;

            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            var endLocation = _CodeLocation - beginLocation;

            endLocation = endLocation.toString(16).toUpperCase();

            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
            }
        }
    }
    else if (node.value === "While") {
        var booleanExpression = node.children[0];
        var block = node.children[1];

        // Get the starting location of the while
        var startLocation = _CodeLocation;

        for (var i = 0; i < booleanExpression.children.length; i++) {
            // If it is an integer compute its value and store it
            if (booleanExpression.children[i].value === "+" || !isNaN(booleanExpression.children[i].value)) {
                var hex = [];
                addIntegerExpression(hex, booleanExpression.children[i]);

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[0];
                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";

                for (var j = 1; j < hex.length; j++) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[j];

                    _ProgramCode[_CodeLocation++] = "6D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";

                    _ProgramCode[_CodeLocation++] = "8D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }

                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
            // If it is an id store the value in the x register or in memory 00
            else if (booleanExpression.children[i].value.length === 1) {
                var id = booleanExpression.children[i];
                var tempKey = getReferenceKey(id);

                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = tempKey;
                    _ProgramCode[_CodeLocation++] = "00";
                }
                else {
                    _ProgramCode[_CodeLocation++] = "AD";
                    _ProgramCode[_CodeLocation++] = tempKey;
                    _ProgramCode[_CodeLocation++] = "00";

                    _ProgramCode[_CodeLocation++] = "8D";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
            // If it is true/false store the boolean value in the x register or in memory 00
            else if (booleanExpression.children[i].value === "true" || booleanExpression.children[i].value === "false") {
                var boolean = addBooleanExpression(booleanExpression.children[i]);

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = "00";
                _ProgramCode[_CodeLocation++] = "00";

                if (i === 0) {
                    _ProgramCode[_CodeLocation++] = "AE";
                    _ProgramCode[_CodeLocation++] = "00";
                    _ProgramCode[_CodeLocation++] = "00";
                }
            }
        }

        if (booleanExpression.value === "==") {
            // Compare and set up the jump
            var jump = getJumpKey();
            _ProgramCode[_CodeLocation++] = "EC";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jump;

            // Get the code location before the block
            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            // Compare zero and one so that it is forced to jump to the while conditional
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = "00";

            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";


            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "01";

            _ProgramCode[_CodeLocation++] = "EC";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            // Compute the jump location to the conditional
            var jumpToWhile  = (254 - _CodeLocation + startLocation).toString(16).toUpperCase();

            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jumpToWhile;

            // Get the ending location so that the while can jump over all of its code
            var endLocation = _CodeLocation - beginLocation;

            endLocation = endLocation.toString(16).toUpperCase();

            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
            }
        }
        else if (booleanExpression.value === "!=") {

        }
        else if (booleanExpression.value === "true") {
            // Don't compare or jump because it will run forever
            generateProgramCode(block);

            // Compare zero to one to jump back
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = "00";

            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";


            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "01";

            _ProgramCode[_CodeLocation++] = "EC";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

            // Compute jump distance
            var jumpToWhile  = (254 - _CodeLocation + startLocation).toString(16).toUpperCase();

            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jumpToWhile;
        }
        // If it just false compute the jump to skip of the code block
        else if (booleanExpression.value === "false") {
            var jump = getJumpKey();

            _ProgramCode[_CodeLocation++] = "D0";
            _ProgramCode[_CodeLocation++] = jump;

            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            var endLocation = _CodeLocation - beginLocation;

            endLocation = endLocation.toString(16).toUpperCase();

            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
            }
        }
    }

}

// Gets the boolean value depending on true or false value
function addBooleanExpression(node) {
    if (node.value === "true")
        return "01";
    else if (node.value === "false")
        return "00";
    else {
        var value = _SymbolTable.currentScope.getSymbolValue(node);

        if (value === "true")
            return "01";
        else if (value === "false")
            return "00";
    }
}

// Returns an array of hex values
function addIntegerExpression(hex, node) {
    if (node.value === "+") {
        hex.push("0" + node.children[0].value);

        node = node.children[1];

        if (node.value === "+") {
            addIntegerExpression(hex, node);
        }
        // If it is an id get the symbol's value
        else if (node.value.length === 1 && isNaN(node.value)) {
            var value = _SymbolTable.currentScope.getSymbolValue(node);

            hex.push("0" + value);
        }
        else {
            hex.push("0" + node.value);
        }
    }
    // If it is an id get the symbol's value
    else if (node.value.length === 1 && isNaN(node.value)) {
        var value = _SymbolTable.currentScope.getSymbolValue(node);

        hex.push("0" + value);
    }
    else {
        hex.push("0" + node.value);
    }
}

// Get the reference key
function getReferenceKey(node) {
    var id = node.value;
    var scope = _SymbolTable.currentScope.getSymbol(node).scope;
    var type = _SymbolTable.currentScope.getSymbolType(node);

    // If it already in the table just return the key
    for (var key in _ReferenceTable) {
       if (_ReferenceTable[key].id === id && _ReferenceTable[key].scope === scope)
            return key;
    }

    var entries = 0;

    // Get the entries in the table for the next temp name
    for (var i in _ReferenceTable) {
        entries++;
    }

    var offset = 0;

    // Get the offset to store in static data section
    for (var i in _ReferenceTable) {
        offset++;
    }

    offset++;

    _ReferenceTable["T" + entries] = {"id": id, "type": type, "scope":scope, "offset": offset};

    return "T" + entries;
}

// Compute temp jump keys, but we only need the name
// We still need the jump table entries so that jump keys are different
function getJumpKey() {
    var entries = 0;

    for (var i in _JumpTable) {
        entries++;
    }

    _JumpTable["J" + entries] = null;

    return "J" + entries;
}

function backPatch() {
    referenceBackPatch();
}

function referenceBackPatch() {
    // Go through keys
    for (var key in _ReferenceTable) {

        // Get the location depending on the last code location and the offset
        var location = (_ReferenceTable[key].offset + _CodeLocation).toString(16).toUpperCase();

        if (location.length === 1) {
            location = "0" + location;
        }

        // Replace all the keys with the location
        for (var i = 0; i < _ProgramCode.length; i++) {
            if (_ProgramCode[i] === key) {
                _ProgramCode[i] = location;
            }
        }
    }
}