/* --------
 CodeGeneration.js

 Performs the code generation.
 -------- */

function codeGeneration() {

    putMessage("Starting Code Generation");

    generateProgramCode(_AST.root);
    backPatch();

    if (_ProgramCode.length > 256) {
        putMessage("Code generated larger than 256 bytes. Please try smaller code");
        _ErrorCount++;
    }

    for (var i = 0; i < 256; i++) {
        if (_ProgramCode[i] === undefined) {
            _ProgramCode[i] = "00";
        }
    }

    if (_ErrorCount < 1) {
        var code = _ProgramCode.join(" ");
        document.getElementById("taCode").value = code;
    }
    else {
        putMessage("There were errors in your code generation. Try again");
    }
}

function generateProgramCode(node) {
    if (_HeapLocation < _CodeLocation) {
        putMessage("Stack-Heap Collision.");
        _ErrorCount++;
        _CodeLocation = 0;
        _HeapLocation = 255;
        return;
    }

    if (node.value === "Program Start") {
        generateProgramCode(node.children[0]);
    }
    else if (node.value === "{}") {
        _SymbolTable.traverseScope();

        for (var i in node.children) {
            generateProgramCode(node.children[i]);
        }

        _SymbolTable.endScope();
    }
    else if (node.value === "Print") {
        var child = node.children[0];

        if (child.value.length === 1 && isNaN(child.value)) {
            var type = _SymbolTable.currentScope.getSymbolType(child);

            if (type === "int" || type === "boolean") {
                var tempKey = getReferenceTableKey(child);

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "01";

                _ProgramCode[_CodeLocation++] = "AC";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "FF";
            }
            else {
                var tempKey = getReferenceTableKey(child);

                _ProgramCode[_CodeLocation++] = "A2";
                _ProgramCode[_CodeLocation++] = "02";

                _ProgramCode[_CodeLocation++] = "AC";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "FF";
            }
        }
        else if (child.value.indexOf("\"") != -1) {
            var string = child.value.replace(/"/g, "");

            var tempHeap = _HeapLocation - string.length;

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
        else if (child.value === "true" || child.value === "false") {
            var tempHeap = _HeapLocation - child.value.length;

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
        else {
            var hex = [];
            addIntegerExpression(hex, child);

            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = hex[0];
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = "00";
            _ProgramCode[_CodeLocation++] = "00";

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
        var tempKey = getReferenceTableKey(id);

        if (type === "int") {
            var hex = [];
            addIntegerExpression(hex, value);

            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = hex[0];
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = tempKey;
            _ProgramCode[_CodeLocation++] = "00";

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
        else if (type === "boolean") {
            var boolean = addBooleanExpression(value);

            _ProgramCode[_CodeLocation++] = "A9";
            _ProgramCode[_CodeLocation++] = boolean;
            _ProgramCode[_CodeLocation++] = "8D";
            _ProgramCode[_CodeLocation++] = tempKey;
            _ProgramCode[_CodeLocation++] = "00";
        }
        else if (type === "string") {
            if (value.value.length === 1) {
                var idReference = getReferenceTableKey(value);

                _ProgramCode[_CodeLocation++] = "AD";
                _ProgramCode[_CodeLocation++] = idReference;
                _ProgramCode[_CodeLocation++] = "00";

                _ProgramCode[_CodeLocation++] = "8D";
                _ProgramCode[_CodeLocation++] = tempKey;
                _ProgramCode[_CodeLocation++] = "00";
            }
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
    else if (node.value === "Declare") {
        var id = node.children[1];

        _ProgramCode[_CodeLocation++] = "A9";
        _ProgramCode[_CodeLocation++] = "00";

        _ProgramCode[_CodeLocation++] = "8D";
        _ProgramCode[_CodeLocation++] = getReferenceTableKey(id);
        _ProgramCode[_CodeLocation++] = "00";
    }
    else if (node.value === "If") {
        var booleanExpression = node.children[0];
        var block = node.children[1];


    }
    else if (node.value === "While") {

    }

}

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

function addIntegerExpression(hex, node) {
    if (node.value === "+") {
        hex.push("0" + node.children[0].value);

        node = node.children[1];

        if (node.value === "+") {
            addIntegerExpression(hex, node);
        }
        else if (node.value.length === 1 && isNaN(node.value)) {
            var value = _SymbolTable.currentScope.getSymbolValue(node);

            hex.push("0" + value);
        }
        else {
            hex.push("0" + node.value);
        }
    }
    else if (node.value.length === 1 && isNaN(node.value)) {
        var value = _SymbolTable.currentScope.getSymbolValue(node);

        hex.push("0" + value);
    }
    else {
        hex.push("0" + node.value);
    }
}

function getReferenceTableKey(node) {
    var id = node.value;
    var scope = _SymbolTable.currentScope.getSymbol(node).scope;
    var type = _SymbolTable.currentScope.getSymbolType(node);

    for (var key in _ReferenceTable) {
       if (_ReferenceTable[key].id === id && _ReferenceTable[key].scope === scope)
            return key;
    }

    var entries = 0;

    for (key in _ReferenceTable) {
        entries++;
    }

    var offset = 0;

    for (key in _ReferenceTable) {
        offset++;
    }

    offset++;

    _ReferenceTable["T" + entries] = {"id": id, "type": type, "scope":scope, "offset": offset};

    return "T" + entries;
}

function backPatch() {
    referenceBackPatch();
    jumpBackPatch();
}

function referenceBackPatch() {
    for (var key in _ReferenceTable) {
        var location = (_ReferenceTable[key].offset + _CodeLocation++).toString(16).toUpperCase();

        if (location.length === 1) {
            location = "0" + location;
        }

        for (var i = 0; i < _ProgramCode.length; i++) {
            if (_ProgramCode[i] === key) {
                _ProgramCode[i] = location;
            }
        }
    }
}

function jumpBackPatch() {

}