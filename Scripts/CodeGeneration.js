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

                loadYRegisterFromMemory(tempKey);

                _ProgramCode[_CodeLocation++] = "FF";
            }
            // If it is a string load the x register with 2 instead of 1 to print the string
            else {
                var tempKey = getReferenceKey(child);

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterFromMemory(tempKey);

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

            loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
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

            loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
            _ProgramCode[_CodeLocation++] = "FF";

            _HeapLocation--;
        }
        else if (child.value === "==" || child.value === "!=") {
            // For each expression in the child, so true/false or a boolean expression
            for (var i = 0; i < child.children.length; i++) {
                // If it is  an integer compute its value and store it to be compared
                if (child.children[i].value === "+" || !isNaN(child.children[i].value)) {
                    var hex = [];
                    addIntegerExpression(hex, child.children[i]);

                    if (hex[hex.length - 1].indexOf("T") === -1) {
                        _ProgramCode[_CodeLocation++] = "A9";
                        _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                    }
                    else {
                        loadAccumulatorFromMemory(hex[hex.length - 1]);
                    }

                    storeAccumulatorInMemory("00");

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
                    // If it is the second value store it in the 00 memory location
                    else {
                        loadAccumulatorFromMemory(tempKey);

                        storeAccumulatorInMemory("00");
                    }
                }
                // If it is a true/false store it in the memory location 00 or in the x register depending on if it is the first or second value
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
                // Add the comparison and a jump
                var jump = getJumpKey();
                var secondJump = getJumpKey();

                compareXRegisterToMemory();
                branchNotEquals(jump);

                // Store the current code location
                var beginLocation = _CodeLocation;

                // Print true
                var trueOut = "true";
                var tempHeap = _HeapLocation - trueOut.length;

                // Put the characters on the heap
                for (var i = 0; i < trueOut.length; i++) {
                    _ProgramCode[tempHeap++] = trueOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                _HeapLocation = _HeapLocation - trueOut.length;

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                _HeapLocation--;

                // Jump past print false
                addGuaranteedJump();
                branchNotEquals(secondJump);

                var toFalse = _CodeLocation;

                // Print false
                var falseOut = "false";
                var tempHeap = _HeapLocation - falseOut.length;

                // Put the characters on the heap
                for (var i = 0; i < falseOut.length; i++) {
                    _ProgramCode[tempHeap++] = falseOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                _HeapLocation = _HeapLocation - falseOut.length;

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                _HeapLocation--;

                // Compute the jump distance
                var endLocation = _CodeLocation - toFalse;
                var jumpToFalse = toFalse - beginLocation;

                endLocation = endLocation.toString(16).toUpperCase();
                jumpToFalse = jumpToFalse.toString(16).toUpperCase();

                // If it is only one digit add a zero
                if (endLocation.length === 1) {
                    endLocation = "0" + endLocation;
                }

                if (jumpToFalse.length === 1) {
                    jumpToFalse = "0" + jumpToFalse;
                }

                // Replace all of those jumps with the jump distance
                for (var i = 0; i < _ProgramCode.length; i++) {
                    if (_ProgramCode[i] === secondJump) {
                        _ProgramCode[i] = endLocation;
                    }

                    if (_ProgramCode[i] === jump) {
                        _ProgramCode[i] = jumpToFalse;
                    }
                }
            }
            else if (child.value === "!=") {
                // Add the comparison and a jump
                var jump = getJumpKey();
                var secondJump = getJumpKey();

                compareXRegisterToMemory();

                branchNotEquals(jump);

                // Store the current code location
                var beginLocation = _CodeLocation;

                // Print true
                var trueOut = "false";
                var tempHeap = _HeapLocation - trueOut.length;

                // Put the characters on the heap
                for (var i = 0; i < trueOut.length; i++) {
                    _ProgramCode[tempHeap++] = trueOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                _HeapLocation = _HeapLocation - trueOut.length;

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                _HeapLocation--;

                // Jump past print false
                addGuaranteedJump();
                branchNotEquals(secondJump);

                var toFalse = _CodeLocation;

                // Print false
                var falseOut = "true";
                var tempHeap = _HeapLocation - falseOut.length;

                // Put the characters on the heap
                for (var i = 0; i < falseOut.length; i++) {
                    _ProgramCode[tempHeap++] = falseOut.charCodeAt(i).toString(16).toUpperCase();
                }
                _ProgramCode[tempHeap] = "00";

                _HeapLocation = _HeapLocation - falseOut.length;

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                loadYRegisterWithConstant(_HeapLocation.toString(16).toUpperCase());
                _ProgramCode[_CodeLocation++] = "FF";

                _HeapLocation--;

                // Compute the jump distance
                var endLocation = _CodeLocation - toFalse;
                var jumpToFalse = toFalse - beginLocation;

                endLocation = endLocation.toString(16).toUpperCase();
                jumpToFalse = jumpToFalse.toString(16).toUpperCase();

                // If it is only one digit add a zero
                if (endLocation.length === 1) {
                    endLocation = "0" + endLocation;
                }

                if (jumpToFalse.length === 1) {
                    jumpToFalse = "0" + jumpToFalse;
                }

                // Replace all of those jumps with the jump distance
                for (var i = 0; i < _ProgramCode.length; i++) {
                    if (_ProgramCode[i] === secondJump) {
                        _ProgramCode[i] = endLocation;
                    }

                    if (_ProgramCode[i] === jump) {
                        _ProgramCode[i] = jumpToFalse;
                    }
                }
            }
        }
        // Otherwise it is an integer expression
        else {
            var hex = [];
            addIntegerExpression(hex, child);

            // Load the first value into memory
            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = hex[0];

            storeAccumulatorInMemory("00");

            // If there are more values add them
            for (var i = 1; i < hex.length; i++) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                addWithCarryIntoMemory("00");

                storeAccumulatorInMemory("00");
            }

            // Print the values that have been calculated
            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "01";

            loadYRegisterFromMemory("00");

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

            if (hex[hex.length - 1].indexOf("T") === -1) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
            }
            else {
                loadAccumulatorFromMemory(hex[hex.length - 1]);
            }

            storeAccumulatorInMemory(tempKey);

            for (var i = hex.length - 2; i >= 0; i--) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = hex[i];

                addWithCarryIntoMemory(tempKey);

                storeAccumulatorInMemory(tempKey);
            }
        }
        // If it is a boolean get the value of it and store it in the variable location
        else if (type === "boolean") {
            var boolean = addBooleanExpression(value);

            if (boolean.indexOf("T") === -1) {
                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                storeAccumulatorInMemory(tempKey);
            }
            else {
                loadAccumulatorFromMemory(boolean);
                storeAccumulatorInMemory(tempKey);
            }
        }
        else if (type === "string") {
            // If it is another variable store that variables reference in the current variables location
            if (value.value.length === 1) {
                var idReference = getReferenceKey(value);

                loadAccumulatorFromMemory(idReference);

                storeAccumulatorInMemory(tempKey);
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

                storeAccumulatorInMemory(tempKey);

                _HeapLocation--;
            }
        }
    }
    // Put zeroes in the location where the variable will be stored
    else if (node.value === "Declare") {
        var id = node.children[1];

        _ProgramCode[_CodeLocation++] = "A9";
        _ProgramCode[_CodeLocation++] = "00";

        storeAccumulatorInMemory(getReferenceKey(id));
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

                if (hex[hex.length - 1].indexOf("T") === -1) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                }
                else {
                    loadAccumulatorFromMemory(hex[hex.length - 1]);
                }

                storeAccumulatorInMemory("00");

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
                // If it is the second value store it in the 00 memory location
                else {
                    loadAccumulatorFromMemory(tempKey);

                    storeAccumulatorInMemory("00");
                }
            }
            // If it is a true/false store it in the memory location 00 or in the x register depending on if it is the first or second value
            else if (booleanExpression.children[i].value === "true" || booleanExpression.children[i].value === "false") {
                var boolean = addBooleanExpression(booleanExpression.children[i]);

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                storeAccumulatorInMemory("00");

                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
        }

        if (booleanExpression.value === "==") {
            // Add the comparison and a jump
            var jump = getJumpKey();

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
            // Add the comparison and a jump
            var jump = getJumpKey();
            var secondJump = getJumpKey();

            compareXRegisterToMemory();

            // It is false so jump to the statement that will jump to the code
            branchNotEquals(jump);

            var beforeFalseComparison = _CodeLocation;

            addGuaranteedJump();

            // It is true so jump over everything
            branchNotEquals(secondJump);

            // Store the current code location
            var beginLocation = _CodeLocation;

            // Generate the code
            generateProgramCode(block);

            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = "00";

            storeAccumulatorInMemory("00");


            _ProgramCode[_CodeLocation++] = "A2";
            _ProgramCode[_CodeLocation++] = "00";

            compareXRegisterToMemory();

            // Compute the jump distance
            var endLocation = _CodeLocation - beforeFalseComparison;

            var jumpToCode = (254 - _CodeLocation + beginLocation).toString(16).toUpperCase();

            branchNotEquals(jumpToCode);

            var fullJump = _CodeLocation - beginLocation;

            endLocation = endLocation.toString(16).toUpperCase();
            fullJump = fullJump.toString(16).toUpperCase();

            // If it is only one digit add a zero
            if (endLocation.length === 1) {
                endLocation = "0" + endLocation;
            }

            if (fullJump.length === 1) {
                fullJump = "0" + fullJump;
            }

            // Replace all of those jumps with the jump distance
            for (var i = 0; i < _ProgramCode.length; i++) {
                if (_ProgramCode[i] === jump) {
                    _ProgramCode[i] = endLocation;
                }

                if (_ProgramCode[i] === secondJump) {
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

                if (hex[hex.length - 1].indexOf("T") === -1) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[hex.length - 1];
                }
                else {
                    loadAccumulatorFromMemory(hex[hex.length - 1]);
                }

                storeAccumulatorInMemory("00");

                for (var j = hex.length - 2; j >= 0; j--) {
                    _ProgramCode[_CodeLocation++] = "A9";
                    _ProgramCode[_CodeLocation++] = hex[j];

                    addWithCarryIntoMemory("00");

                    storeAccumulatorInMemory("00");
                }

                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
            // If it is an id store the value in the x register or in memory 00
            else if (booleanExpression.children[i].value.length === 1) {
                var id = booleanExpression.children[i];
                var tempKey = getReferenceKey(id);

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

                _ProgramCode[_CodeLocation++] = "A9";
                _ProgramCode[_CodeLocation++] = boolean;

                storeAccumulatorInMemory("00");

                if (i === 0) {
                    loadXRegisterFromMemory("00");
                }
            }
        }

        if (booleanExpression.value === "==") {
            // Compare and set up the jump
            var jump = getJumpKey();
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
            // Compare and set up the jump
            var jump = getJumpKey();
            var secondJump = getJumpKey();

            compareXRegisterToMemory();

            // The statement evaluates to false so it will jump but we want to execute the code then
            // So it jumps to the statement that will jump to the code block
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

            endLocation = endLocation.toString(16).toUpperCase();
            fullJump = fullJump.toString(16).toUpperCase();

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

                if (_ProgramCode[i] === secondJump) {
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