/*
    Test.js

    Holds test programs to be loaded in.
 */

function test1() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nint a\na = 5\nprint(a)\n}$";
}

function test2() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nint a\na = 0\n";
    output.value += "    while (a == 0)\n";
    output.value += "    {\n";
    output.value += "        print (a)\n";
    output.value += "        a = 1 + a\n";
    output.value += "    }\n}$this should give a warning";
}

function test3() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nboolean b\nb = true\nint z\n";
    output.value += "    if (b == true)\n";
    output.value += "    {\n";
    output.value += "        print (\"b is equal to true\")\n";
    output.value += "        z = 5\n";
    output.value += "    }\n}";
}

function test4() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nboolean b\nb = true\nint z\nz = 2\n";
    output.value += "    if (b == false)\n";
    output.value += "    {\n";
    output.value += "        print (\"b is equal to true\")\n";
    output.value += "        z = 5\n";
    output.value += "    }\nprint (z)\n}";
}

function test5() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nint a\na = 5\n{\nboolean a\na = true\nprint (a)\n}\nprint (a)\n}$";
}

function test6() {
    var output = document.getElementById("taSourceCode");
    output.value = "";

    output.value += "{\nint a\na = 5\nint b\nb = 2 + 5\nprint(b)\n}$";
}
