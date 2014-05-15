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

    // If we encounter the program start just continue to the first block
    if (node.value === "Program Start") {
        generateProgramCode(node.children[0]);
    }
    // If we encounter a block visit each of its children
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
        verbosePutMessage("Print statement encountered");

        // Get the node of what is being printed
        var child = node.children[0];

        // The node is an id
        if (child.value.length === 1 && isNaN(child.value)) {
            var type = _SymbolTable.currentScope.getSymbolType(child);

            // If it is an integer or boolean just print out the value
            if (type === "int" || type === "boolean") {
                var tempKey = getReferenceKey(child);

                var before = _CodeLocation;

                // Load the x register with 1 to print an integer
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "01";

                loadYRegisterFromMemory(tempKey);

                _ProgramCode[_CodeLocation++] = "FF";

                var after = _CodeLocation;

                verbosePutMessage("Generating code for printing an id of integer or a boolean");

                for (var i = before; i < after; i++) {
                    verbosePutMessage("    Generated: " + _ProgramCode[i]);
                }
            }
            // If it is a string load the x register with 2 instead of 1 to print the string
            else {
                var tempKey = getReferenceKey(child);

                var before = _CodeLocation;

                // Load the x register with 2 to print a string
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterFromMemory(tempKey);

                _ProgramCode[_CodeLocation++] = "FF";

                var after = _CodeLocation;

                verbosePutMessage("Generating code for printing an id of string");

                for (var i = before; i < after; i++) {
                    verbosePutMessage("    Generated: " + _ProgramCode[i]);
                }
            }
        }
        // If it is a string put it in the heap the print it out
        else if (child.value.indexOf("\"") != -1) {
            // Remove all quotes from a string
            var string = child.value.replace(/"/g, "");

            // Get the start location of the heap to start putting the characters
            var tempHeap = _HeapLocation - string.length;

            // Put the characters in the heap
            for (var i = 0; i < string.length; i++) {
                _ProgramCode[tempHeap++] =  string.charCodeAt(i).toString(16).toUpperCase();
            }
            _ProgramCode[tempHeap] = "00";

            // Get the start heap location so the print starts at the correct location
            _HeapLocation = _HeapLocation - string.length;

            var before = _CodeLocation;

            // Load the x register with 2 to print a string
            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "02";

            loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
            _ProgramCode[_CodeLocation++] = "FF";

            var after = _CodeLocation;

            // Decrease the heap location so that new strings have their own space
            _HeapLocation--;

            verbosePutMessage("Generating code for printing a string at " + (_HeapLocation + 1));

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }

        }
        // If it is true or false just print out those string values
        else if (child.value === "true" || child.value === "false") {
            // Get the start location to start putting the characters in the heap
            var tempHeap = _HeapLocation - child.value.length;

            // Put the characters in the heap
            for (var i = 0; i < child.value.length; i++) {
                _ProgramCode[tempHeap++] = child.value.charCodeAt(i).toString(16).toUpperCase();
            }
            _ProgramCode[tempHeap] = "00";

            // Get the start heap location so the print starts at the right location
            _HeapLocation = _HeapLocation - child.value.length;

            var before = _CodeLocation;

            // Load the x register with 2 to print out a string
            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "02";

            loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
            _ProgramCode[_CodeLocation++] = "FF";

            var after = _CodeLocation;

            // Move the heap location back for other strings
            _HeapLocation--;

            verbosePutMessage("Generating code for print true/false at " + (_HeapLocation + 1));

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
        else if (child.value === "==" || child.value === "!=") {
            verbosePutMessage("Generating code for printing a boolean expression");
            var before = _CodeLocation;

            // For each expression in the child, so true/false or a boolean expression
            for (var i = 0; i < child.children.length; i++) {
                // If it is  an integer compute its value and store it to be compared
                if (child.children[i].value === "+" || !isNaN(child.children[i].value)) {
                    var hex = [];
                    addIntegerExpression(hex, child.children[i]);

                    // If there is a variable in the expression load it into the accumulator otherwise load the integer value
                    if (hex[hex.length - 1].indexOf("T") === -1) {
                        _ProgramCode[_CodeLocation++] = "A9";
                        _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                    }
                    else {
                        loadAccumulatorFromMemory(hex[hex.length - 1]);
                    }

                    // Store it in 00 00 for comparison
                    storeAccumulatorInMemory("00");

                    // Add the rest of the values in the expression into memory location 00 00
                    for (var j = hex.length - 2; j >= 0; j--) {
                        _ProgramCode[_CodeLocation++] = "A9";
                        _ProgramCode[_CodeLocation++] = hex[j];

                        addWithCarryIntoMemory("00");
                        storeAccumulatorInMemory("00");
                    }

                    // If it is the first value store it in the x register
                    if (i === 0) {
                        loadXRegisterFromMemory("00");
                    }
                }
                // If it a variable get the value from the variable location
                else if (child.children[i].value.length === 1) {
                    var id = child.children[i];
                    var tempKey = getReferenceKey(id);

                    // If it is the first value store in it the x register
                    if (i === 0) {
                        loadXRegisterFromMemory(tempKey);
                    }
                    // If it is the second value store it in the 00 00 memory location
                    else {
                        loadAccumulatorFromMemory(tempKey);

                        storeAccumulatorInMemory("00");
                    }
                }
                // If it is a true/false store it in the memory location 00 00 or in the x register depending on if it is the first or second value
                else if (child.children[i].value === "true" || child.children[i].value === "false") {
                    var boolean = addBooleanExpression(child.children[i]);

                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = boolean;

                    storeAccumulatorInMemory("00");

                    if (i === 0) {
                        loadXRegisterFromMemory("00");
                    }
                }
            }

            if (child.value === "==") {
                // Get the two jump keys
                var jump = getJumpKey();
                var secondJump = getJumpKey();

                // Compare and jump to false if not equal otherwise fall through and print true
                compareXRegisterToMemory();
                branchNotEquals(jump);

                // Store the current code location
                var beginLocation = _CodeLocation;

                // Print true
                var trueOut = "true";
                // Get the heap location to store true
                var tempHeap = _HeapLocation - trueOut.length;

                // Put the characters in the heap
                for (var i = 0; i < trueOut.length; i++) {
                    _ProgramCode[tempHeap++] = trueOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                // Get the heap location of where true starts
                _HeapLocation = _HeapLocation - trueOut.length;

                // Load 2 to the x register to print a string
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                // Move the heap back for the next string
                _HeapLocation--;

                // Jump past print false
                addGuaranteedJump();
                branchNotEquals(secondJump);

                var toFalse = _CodeLocation;

                // Print false
                var falseOut = "false";
                // Get the heap location to store false
                var tempHeap = _HeapLocation - falseOut.length;

                // Put the characters on the heap
                for (var i = 0; i < falseOut.length; i++) {
                    _ProgramCode[tempHeap++] = falseOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                // Get the heap location of where false is stored
                _HeapLocation = _HeapLocation - falseOut.length;

                // Load 2 into the x register to print a string
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                // Move the heap back for a new string
                _HeapLocation--;

                // Compute the jump distance to past everything and to the print false code
                var endLocation = _CodeLocation - toFalse;
                var jumpToFalse = toFalse - beginLocation;

                // Convet the numbers to hex
                endLocation = endLocation.toString(16).toUpperCase();
                jumpToFalse = jumpToFalse.toString(16).toUpperCase();

                // If it is only one digit add a zero
                if (endLocation.length === 1) {
                    endLocation = "0" + endLocation;
                }
                // If it is only one digit add a zero
                if (jumpToFalse.length === 1) {
                    jumpToFalse = "0" + jumpToFalse;
                }

                // Replace all of those jumps with the jump distance
                for (var i = 0; i < _ProgramCode.length; i++) {
                    if (_ProgramCode[i] === secondJump) {
                        _ProgramCode[i] = endLocation;
                    }
                    else if (_ProgramCode[i] === jump) {
                        _ProgramCode[i] = jumpToFalse;
                    }
                }
            }
            else if (child.value === "!=") {
                // Get the temporary jump keys
                var jump = getJumpKey();
                var secondJump = getJumpKey();

                // If they are not equal jump to the print true statement
                // Otherwise they are equal and fall through to print false
                compareXRegisterToMemory();
                branchNotEquals(jump);

                // Store the current code location
                var beginLocation = _CodeLocation;

                // Print false
                var trueOut = "false";
                // Get heap location for false
                var tempHeap = _HeapLocation - trueOut.length;

                // Put the characters on the heap
                for (var i = 0; i < trueOut.length; i++) {
                    _ProgramCode[tempHeap++] = trueOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                // Get heap location of where false starts
                _HeapLocation = _HeapLocation - trueOut.length;

                // Load the x register with 2 to print a string
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                // Move the heap back for new strings
                _HeapLocation--;

                // Jump past print true
                addGuaranteedJump();
                branchNotEquals(secondJump);

                var toFalse = _CodeLocation;

                // Print true
                var falseOut = "true";
                // Get the starting heap location for true
                var tempHeap = _HeapLocation - falseOut.length;

                // Put the characters on the heap
                for (var i = 0; i < falseOut.length; i++) {
                    _ProgramCode[tempHeap++] = falseOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                // Get the starting location of true
                _HeapLocation = _HeapLocation - falseOut.length;

                // Load 2 into the x register to print a string
                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                // Move the heap back for new strings
                _HeapLocation--;

                // Compute the jump distance over everything and to the the print true statement
                var endLocation = _CodeLocation - toFalse;
                var jumpToFalse = toFalse - beginLocation;

                // Convert to hex
                endLocation = endLocation.toString(16).toUpperCase();
                jumpToFalse = jumpToFalse.toString(16).toUpperCase();

                // If it is only one digit add a zero
                if (endLocation.length === 1) {
                    endLocation = "0" + endLocation;
                }
                // If it is only one digit add a zero
                if (jumpToFalse.length === 1) {
                    jumpToFalse = "0" + jumpToFalse;
                }

                // Replace all of those jumps with the jump distance
                for (var i = 0; i < _ProgramCode.length; i++) {
                    if (_ProgramCode[i] === secondJump) {
                        _ProgramCode[i] = endLocation;
                    }
                    else if (_ProgramCode[i] === jump) {
                        _ProgramCode[i] = jumpToFalse;
                    }
                }
            }

            var after = _CodeLocation;

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
        // Otherwise it is an integer expression
        else {
            var hex = [];
            addIntegerExpression(hex, child);

            var before = _CodeLocation;

            // Get the last part of the integer expression whether it is an id or integer
            if (hex[hex.length - 1].indexOf("T") === -1) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
            }
            else {
                loadAccumulatorFromMemory(hex[hex.length - 1]);
            }

            // Store the value in 00 00
            storeAccumulatorInMemory("00");

            // Add the other parts of the integer expression into 00 00
            for (var i = hex.length - 2; i >= 0; i--) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                addWithCarryIntoMemory("00");

                storeAccumulatorInMemory("00");
            }

            // Load 1 into x register to print an integer
            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "01";

            loadYRegisterFromMemory("00");

            _ProgramCode[_CodeLocation++] = "FF";

            var after = _CodeLocation;

            verbosePutMessage("Generating code for printing an integer expression");

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
    }
    else if (node.value === "=") {
        verbosePutMessage("Assignment Statement encountered");

        var id = node.children[0];
        var value = node.children[1];
        var type = _SymbolTable.currentScope.getSymbolType(id);
        var tempKey = getReferenceKey(id);

        if (type === "int") {
            var hex = [];
            addIntegerExpression(hex, value);

            var before = _CodeLocation;

            // Get the last part of an integer expression whether it is an id or an integer
            // This is so that variables do not override when writing into the same location
            if (hex[hex.length - 1].indexOf("T") === -1) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
            }
            else {
                loadAccumulatorFromMemory(hex[hex.length - 1]);
            }

            // Store it in the memory address of the variable
            storeAccumulatorInMemory(tempKey);

            // Add the rest of the expression into the variable's location
            for (var i = hex.length - 2; i >= 0; i--) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                addWithCarryIntoMemory(tempKey);

                storeAccumulatorInMemory(tempKey);
            }

            var after = _CodeLocation;

            verbosePutMessage("Generating code to assign an integer");

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
        // If it is a boolean get the value of it and store it in the variable location
        else if (type === "boolean") {
            var boolean = addBooleanExpression(value);

            var before = _CodeLocation;

            // Get the memory location of where the boolean id is
            // Otherwise store the value in the variable's location
            if (boolean.indexOf("T") === -1) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                storeAccumulatorInMemory(tempKey);
            }
            else {
                loadAccumulatorFromMemory(boolean);
                storeAccumulatorInMemory(tempKey);
            }

            var after = _CodeLocation;

            verbosePutMessage("Generating code to assign a boolean");

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
        else if (type === "string") {
            var before = _CodeLocation;
            // If it is another variable store that variables reference in the current variables location
            if (value.value.length === 1) {
                var idReference = getReferenceKey(value);

                loadAccumulatorFromMemory(idReference);

                storeAccumulatorInMemory(tempKey);
            }
            // Otherwise put the string on the heap and store the heap location in the variable location
            else {
                value = value.value.replace(/"/g, "");

                // Get the location to put it in the heap
                var tempHeap = _HeapLocation - value.length;

                for (var i = 0; i < value.length; i++) {
                    _ProgramCode[tempHeap++] =  value.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                // Get the heap location where the string is stored
                _HeapLocation = _HeapLocation - value.length;

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = _HeapLocation.toString(16).toUpperCase();

                // Store the memory address of the string in the variable's location
                storeAccumulatorInMemory(tempKey);

                // Move the heap location back for a new string
                _HeapLocation--;
            }

            var after = _CodeLocation;

            verbosePutMessage("Generating code to assign a string at " + (_HeapLocation + 1));

            for (var i = before; i < after; i++) {
                verbosePutMessage("    Generated: " + _ProgramCode[i]);
            }
        }
    }
    // Put zeroes in the location where the variable will be stored
    else if (node.value === "Declare") {
        var id = node.children[1];
        var before = _CodeLocation;

        // Put 00 in the variable's location
        _ProgramCode[_CodeLocation++] = "A9";
        _ProgramCode[_CodeLocation++] = "00";
        storeAccumulatorInMemory(getReferenceKey(id));

        var after = _CodeLocation;
        verbosePutMessage("Generating code to declare an id");

        for (var i = before; i < after; i++) {
            verbosePutMessage("    Generated: " + _ProgramCode[i]);
        }
    }
    else if (node.value === "If") {
        verbosePutMessage("If-statement encountered");

        var booleanExpression = node.children[0];
        var block = node.children[1];

        var before = _CodeLocation;

        // For each expression in the child, so true/false or a boolean expression
        for (var i = 0; i < booleanExpression.children.length; i++) {
            // If it is  an integer compute its value and store it to be compared
            if (booleanExpression.children[i].value === "+" || !isNaN(booleanExpression.children[i].value)) {
                var hex = [];
                addIntegerExpression(hex, booleanExpression.children[i]);

                // Get the last part of the integer expression
                if (hex[hex.length - 1].indexOf("T") === -1) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                }
                else {
                    loadAccumulatorFromMemory(hex[hex.length - 1]);
                }

                // Store it in 00 00
                storeAccumulatorInMemory("00");

                // Add the rest of the integer expression and store it in 00 00
                for (var j = hex.length - 2; j >= 0; j--) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[j];

                    addWithCarryIntoMemory("00");

                    storeAccumulatorInMemory("00");
                }

                // If it is the first value store it in the x register
                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
            // If it a variable get the value from the variable location
            else if (booleanExpression.children[i].value.length === 1) {
                var id = booleanExpression.children[i];
                var tempKey = getReferenceKey(id);

                // If it is the first value store in it the x register
                if (i === 0) {
                    loadXRegisterFromMemory(tempKey);
                }
                // If it is the second value store it in the 00 00 memory location
                else {
                    loadAccumulatorFromMemory(tempKey);

                    storeAccumulatorInMemory("00");
                }
            }
            // If it is a true/false store it in the memory location 00 or in the x register depending on if it is the first or second value
            else if (booleanExpression.children[i].value === "true" || booleanExpression.children[i].value === "false") {
                var boolean = addBooleanExpression(booleanExpression.children[i]);

                // Load the value into the accumulator then store into 00 00
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                storeAccumulatorInMemory("00");

                // If it is the first one store it in the x register
                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
        }

        var after = _CodeLocation;

        for (var i = before; i < after; i++) {
            verbosePutMessage("    Generated for condition: " + _ProgramCode[i]);
        }

        before = _CodeLocation;

        if (booleanExpression.value === "==") {
            // Get the jump key
            var jump = getJumpKey();

            // If they are not equal jump past everything otherwise fall through
            compareXRegisterToMemory();
            branchNotEquals(jump);

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
            // Get the jump keys
            var jump = getJumpKey();
            var secondJump = getJumpKey();

            // If the statement evaluates to true jump to the jump that will jump to the code
            // Otherwise fall through
            compareXRegisterToMemory();
            branchNotEquals(jump);

            var beforeFalseComparison = _CodeLocation;

            // It if the statement evaluates to false then jump over everything
            addGuaranteedJump();
            branchNotEquals(secondJump);

            // Store the current code location
            var beginLocation = _CodeLocation;

            // Generate the code
            generateProgramCode(block);

            // Make sure that z flag is reset so that we do not jump again
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = "00";

            storeAccumulatorInMemory("00");

            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "00";

            compareXRegisterToMemory();

            // Compute the jump distance
            var endLocation = _CodeLocation - beforeFalseComparison;

            var jumpToCode = (254 - _CodeLocation + beginLocation).toString(16).toUpperCase();

            // Jump the code
            branchNotEquals(jumpToCode);

            // Full jump over the code
            var fullJump = _CodeLocation - beginLocation;

            // Get hex
            endLocation = endLocation.toString(16).toUpperCase();
            fullJump = fullJump.toString(16).toUpperCase();

            // If it is only one digit add a zero
            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }
            // If it is only one digit add a zero
            if (fullJump.length === 1) {
                fullJump = "0" + fullJump;
            }

            // Replace all of those jumps with the jump distance
            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
                else if (_ProgramCode[i] === secondJump) {
                    _ProgramCode[i] = fullJump;
                }
            }
        }
        // If it is straight true just generate the block do not jump
        else if (booleanExpression.value === "true") {
            generateProgramCode(block);
        }
        // If it is false do not even compare just jump
        else if (booleanExpression.value === "false") {
            var jump = getJumpKey();
            branchNotEquals(jump);

            var beginLocation = _CodeLocation;

            // Generate block code
            generateProgramCode(block);

            var endLocation = _CodeLocation - beginLocation;

            // Get hex
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

        after = _CodeLocation;

        for (var i = before; i < after; i++) {
            verbosePutMessage("    Generated in block or equality check: " + _ProgramCode[i]);
        }
    }
    else if (node.value === "While") {
        verbosePutMessage("While statement encountered");

        var booleanExpression = node.children[0];
        var block = node.children[1];

        // Get the starting location of the while
        var startLocation = _CodeLocation;

        var before = _CodeLocation;

        for (var i = 0; i < booleanExpression.children.length; i++) {
            // If it is an integer compute its value and store it
            if (booleanExpression.children[i].value === "+" || !isNaN(booleanExpression.children[i].value)) {
                var hex = [];
                addIntegerExpression(hex, booleanExpression.children[i]);

                // Get the last part of the integer expression
                if (hex[hex.length - 1].indexOf("T") === -1) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                }
                else {
                    loadAccumulatorFromMemory(hex[hex.length - 1]);
                }

                // Store into 00 00
                storeAccumulatorInMemory("00");

                // Add and store the rest in 00 00
                for (var j = hex.length - 2; j >= 0; j--) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[j];

                    addWithCarryIntoMemory("00");

                    storeAccumulatorInMemory("00");
                }

                // If it the first one in the x register
                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
            // If it is an id store the value in the x register or in memory 00
            else if (booleanExpression.children[i].value.length === 1) {
                var id = booleanExpression.children[i];
                var tempKey = getReferenceKey(id);

                // Store the first id in the accumulator or store it in 00 00
                if (i === 0) {
                    storeAccumulatorInMemory(tempKey);
                }
                else {
                    loadAccumulatorFromMemory(tempKey);

                    storeAccumulatorInMemory("00");
                }
            }
            // If it is true/false store the boolean value in the x register or in memory 00
            else if (booleanExpression.children[i].value === "true" || booleanExpression.children[i].value === "false") {
                var boolean = addBooleanExpression(booleanExpression.children[i]);

                // Store the value in the accumulator
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                // Store it in 00 00
                storeAccumulatorInMemory("00");

                // If it is the first one store it in the x register
                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
        }

        var after = _CodeLocation;

        after = _CodeLocation;

        for (var i = before; i < after; i++) {
            verbosePutMessage("    Generated for conditional: " + _ProgramCode[i]);
        }

        before = _CodeLocation;

        if (booleanExpression.value === "==") {
            // Get the jump key
            var jump = getJumpKey();

            // Compare and branch
            compareXRegisterToMemory();
            branchNotEquals(jump);

            // Get the code location before the block
            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            addGuaranteedJump();

            // Compute the jump location to the conditional
            var jumpToWhile  = (254 - _CodeLocation + startLocation).toString(16).toUpperCase();

            branchNotEquals(jumpToWhile);

            // Get the ending location so that the while can jump over all of its code
            var endLocation = _CodeLocation - beginLocation;

            // Convert to hex
            endLocation = endLocation.toString(16).toUpperCase();

            // If it is only 1 character add a zero
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
            // Get the jump keys
            var jump = getJumpKey();
            var secondJump = getJumpKey();

            // The statement evaluates to false so it will jump but we want to execute the code then
            // So it jumps to the statement that will jump to the code block
            compareXRegisterToMemory();
            branchNotEquals(jump);

            var beforeFalseCompare = _CodeLocation;


            // The statement evaluates to true so we do not want to execute the code
            // So we jump over everything
            addGuaranteedJump();
            branchNotEquals(secondJump);

            // Get the code location before the block
            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            addGuaranteedJump();

            // Compute the jump location to the conditional
            var jumpToWhile  = (254 - _CodeLocation + startLocation).toString(16).toUpperCase();

            // Jumps back to the beginning of the while
            branchNotEquals(jumpToWhile);

            // Get the ending location so that the while can jump over all of its code
            var endLocation = _CodeLocation - beforeFalseCompare;

            var jumpToCode  = (254 - _CodeLocation + beginLocation).toString(16).toUpperCase();

            // Jumps to the beginning of the code
            branchNotEquals(jumpToCode);

            var fullJump = _CodeLocation - beginLocation;

            // Convert to hex
            endLocation = endLocation.toString(16).toUpperCase();
            fullJump = fullJump.toString(16).toUpperCase();

            // Add a leading zero if necessary
            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            if (fullJump.length === 1) {
                fullJump = "0" + fullJump;
            }

            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
                else if (_ProgramCode[i] === secondJump) {
                    _ProgramCode[i] = fullJump;
                }
            }
        }
        else if (booleanExpression.value === "true") {
            // Don't compare or jump because it will run forever
            generateProgramCode(block);

            addGuaranteedJump();

            // Compute jump distance
            var jumpToWhile  = (254 - _CodeLocation + startLocation).toString(16).toUpperCase();

            branchNotEquals(jumpToWhile);
        }
        // If it just false compute the jump to skip of the code block
        else if (booleanExpression.value === "false") {
            var jump = getJumpKey();

            branchNotEquals(jump);

            var beginLocation = _CodeLocation;

            generateProgramCode(block);

            var endLocation = _CodeLocation - beginLocation;

            // Get the hex
            endLocation = endLocation.toString(16).toUpperCase();

            // Add a leading zero
            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }
            }
        }

        after = _CodeLocation;

        for (var i = before; i < after; i++) {
            verbosePutMessage("    Generated in block or equality check: " + _ProgramCode[i]);
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
        var value = getReferenceKey(node);

        return value;
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
            var value = getReferenceKey(node);

            hex.push(value);
        }
        else {
            hex.push("0" + node.value);
        }
    }
    // If it is an id get the symbol's value
    else if (node.value.length === 1 && isNaN(node.value)) {
        var value = getReferenceKey(node);

        hex.push(value);
    }
    else {
        hex.push("0" + node.value);
    }
}

// Get the reference key
function getReferenceKey(node) {
    var id = node.value;
    var scope = _SymbolTable.currentScope.getSymbol(node).scope;

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

    _ReferenceTable["T" + entries] = {"id": id, "scope":scope, "offset": offset};

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

function loadYRegisterFromMemory(location) {
    _ProgramCode[_CodeLocation++] = "AC";
    _ProgramCode[_CodeLocation++] = location;
    _ProgramCode[_CodeLocation++] = "00";
}

function loadAccumulatorFromMemory(location) {
    _ProgramCode[_CodeLocation++] = "AD";
    _ProgramCode[_CodeLocation++] = location;
    _ProgramCode[_CodeLocation++] = "00";
}

function storeAccumulatorInMemory(location) {
    _ProgramCode[_CodeLocation++] = "8D";
    _ProgramCode[_CodeLocation++] = location;
    _ProgramCode[_CodeLocation++] = "00";
}

function addWithCarryIntoMemory(location) {
    _ProgramCode[_CodeLocation++] = "6D";
    _ProgramCode[_CodeLocation++] = location;
    _ProgramCode[_CodeLocation++] = "00";
}

function loadXRegisterFromMemory(location) {
    _ProgramCode[_CodeLocation++] = "AE";
    _ProgramCode[_CodeLocation++] = location;
    _ProgramCode[_CodeLocation++] = "00";
}

function loadYRegisterWithConstant (hex) {
    _ProgramCode[_CodeLocation++] = "A0";
    _ProgramCode[_CodeLocation++] = hex;
}

function compareXRegisterToMemory() {
    _ProgramCode[_CodeLocation++] = "EC";
    _ProgramCode[_CodeLocation++] = "00";
    _ProgramCode[_CodeLocation++] = "00";
}

function branchNotEquals(jump) {
    _ProgramCode[_CodeLocation++] = "D0";
    _ProgramCode[_CodeLocation++] = jump;
}

function addGuaranteedJump() {
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
}